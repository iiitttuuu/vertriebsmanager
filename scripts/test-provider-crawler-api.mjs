import assert from "node:assert/strict";

const { default: providerCrawlerHandler, __providerCrawlerTestables } = await import(new URL("../api/provider-crawler.js", import.meta.url));

function response(status, payload) {
  const text = typeof payload === "string" ? payload : JSON.stringify(payload);
  return { ok: status >= 200 && status < 300, status, async text() { return text; }, async json() { return text ? JSON.parse(text) : null; }, headers: new Headers() };
}

function result() {
  return { statusCode: 200, payload: null, setHeader() {}, status(code) { this.statusCode = code; return this; }, json(payload) { this.payload = payload; return this; } };
}

function aal2Token() {
  const payload = Buffer.from(JSON.stringify({ aal: "aal2" })).toString("base64url");
  return `header.${payload}.signature`;
}

async function invoke(body, routeHandler) {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return routeHandler(String(url), options, calls);
  };
  process.env.SUPABASE_URL = "https://crawler-test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
  try {
    const res = result();
    await providerCrawlerHandler({ method: "POST", headers: { authorization: `Bearer ${aal2Token()}` }, body }, res);
    return { res, calls };
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  }
}

function baseRoutes(overrides = {}) {
  return (url, options, calls) => {
    if (url.includes("/auth/v1/user")) return response(200, { id: "11111111-1111-4111-8111-111111111111" });
    if (url.includes("/rest/v1/profiles?")) return response(200, [{ user_id: "11111111-1111-4111-8111-111111111111", role: "admin", status: "active", full_name: "Admin" }]);
    return overrides.route?.(url, options, calls) || response(200, []);
  };
}

const protectedProvider = await invoke(
  { action: "enqueue", providerIds: ["provider-protected"] },
  baseRoutes({ route: (url) => {
    if (url.includes("/rest/v1/providers?")) return response(200, [{ id: "provider-protected", name: "Geschützter Anbieter", website: "https://example.test", dashboard_created: true }]);
    if (url.includes("/rest/v1/provider_crawl_runs")) throw new Error("Für bereits angelegte Anbieter darf kein Crawl-Job geschrieben werden.");
  } })
);
assert.equal(protectedProvider.res.statusCode, 200);
assert.equal(protectedProvider.res.payload.created.length, 0, "Bereits angelegte Anbieter werden nicht eingereiht.");
assert.equal(protectedProvider.res.payload.skipped[0].reason, "already_created");

const legacyProtectedProvider = await invoke(
  { action: "enqueue", providerIds: ["provider-legacy-protected"] },
  baseRoutes({ route: (url) => {
    if (url.includes("/rest/v1/providers?")) return response(200, [{ id: "provider-legacy-protected", name: "Geschützter Legacy-Anbieter", website: "https://example.test", dashboard_created: false, payload: { dashboardCreated: true } }]);
    if (url.includes("/rest/v1/provider_crawl_runs")) throw new Error("Auch die Legacy-Dashboard-Markierung muss einen Crawl verhindern.");
  } })
);
assert.equal(legacyProtectedProvider.res.payload.created.length, 0, "Die Legacy-Dashboard-Markierung wird serverseitig berücksichtigt.");
assert.equal(legacyProtectedProvider.res.payload.skipped[0].reason, "already_created");

const missingWebsite = await invoke(
  { action: "enqueue", providerIds: ["provider-no-site"] },
  baseRoutes({ route: (url) => {
    if (url.includes("/rest/v1/providers?")) return response(200, [{ id: "provider-no-site", name: "Ohne Website", website: "", dashboard_created: false }]);
    if (url.includes("/rest/v1/provider_crawl_runs")) throw new Error("Ohne Website darf kein Crawl-Job geschrieben werden.");
  } })
);
assert.equal(missingWebsite.res.payload.created.length, 0);
assert.equal(missingWebsite.res.payload.skipped[0].reason, "missing_website");

const queuedProvider = await invoke(
  { action: "enqueue", providerIds: ["provider-allowed"] },
  baseRoutes({ route: (url) => {
    if (url.includes("/rest/v1/providers?")) return response(200, [{ id: "provider-allowed", name: "Crawlbar", website: "https://example.test", dashboard_created: false }]);
    if (url.includes("/rest/v1/provider_crawl_runs") && !url.includes("?")) return response(201, [{ id: "run-allowed", provider_id: "provider-allowed", status: "queued" }]);
    if (url.includes("/rest/v1/provider_crawl_events")) return response(201, []);
  } })
);
assert.equal(queuedProvider.res.payload.created.length, 1, "Ein Anbieter mit Website und dashboard_created=false wird eingereiht.");

const changedWhileQueued = await invoke(
  { action: "process_next" },
  baseRoutes({ route: (url, options) => {
    if (url.includes("/rest/v1/provider_crawl_runs?") && options.method === "GET") return response(200, [{ id: "run-queued", provider_id: "provider-race", website_snapshot: "https://example.test", status: "queued" }]);
    if (url.includes("/rest/v1/provider_crawl_runs?") && options.method === "PATCH" && url.includes("status=eq.queued")) return response(200, [{ id: "run-queued", provider_id: "provider-race", website_snapshot: "https://example.test", status: "running" }]);
    if (url.includes("/rest/v1/providers?")) return response(200, [{ id: "provider-race", website: "https://example.test", dashboard_created: true }]);
    if (url.includes("/rest/v1/provider_crawl_runs?") && options.method === "PATCH" && url.includes("status=eq.running")) return response(200, [{ id: "run-queued", status: "skipped_already_created" }]);
    if (url.includes("/rest/v1/provider_crawl_events")) return response(201, []);
  } })
);
assert.equal(changedWhileQueued.res.payload.status, "skipped_already_created", "Unmittelbar vor dem Crawl wird dashboard_created erneut geprüft.");
assert.equal(changedWhileQueued.calls.some((call) => call.url === "https://example.test/"), false, "Bei späterer Dashboard-Anlage wird keine Anbieter-Website abgerufen.");

const editorialPages = [
  { url: "https://example.test/angebote", title: "Angebote", html: "<h1>Erlebnisse</h1><h2>Geführte Kajaktour</h2><p>Eine Tour auf dem See mit geschulten Guides.</p>", text: "Erlebnisse Geführte Kajaktour Eine Tour auf dem See mit geschulten Guides." },
  { url: "https://example.test/angebote/kajak", title: "Kajaktour", html: "<h1>Geführte Kajaktour</h1><p>Die Tour wird von erfahrenen Guides begleitet.</p>", text: "Geführte Kajaktour Die Tour wird von erfahrenen Guides begleitet." },
];
const editorialOffers = __providerCrawlerTestables.chooseOffers(editorialPages);
assert.ok(editorialOffers.some((offer) => offer.original_title === "Geführte Kajaktour"), "Angebote werden auch aus passenden Seitenüberschriften erkannt.");
const editorialSource = __providerCrawlerTestables.createEditorialSource(editorialPages, editorialOffers);
assert.equal(editorialSource[0].source_url, "https://example.test/angebote", "Relevante Angebotsseiten stehen im redaktionellen KI-Kontext vorn.");
assert.equal(__providerCrawlerTestables.cleanEditorialText("Absatz eins\n\n\nAbsatz zwei"), "Absatz eins\n\nAbsatz zwei", "Redaktionelle Absätze bleiben beim Speichern erhalten.");

console.log("Anbieter-Crawler-API geprüft: Eligibility, Race-Check, redaktionelle Quellen und Angebots-Erkennung.");
