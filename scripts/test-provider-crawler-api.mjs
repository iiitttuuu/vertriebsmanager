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

const recoveredStaleRun = await invoke(
  { action: "process_next" },
  baseRoutes({ route: (url, options) => {
    if (url.includes("/rest/v1/provider_crawl_runs?select=id&status=eq.running")) return response(200, [{ id: "run-stale" }]);
    if (url.includes("/rest/v1/provider_crawl_runs?id=eq.run-stale&status=eq.running") && options.method === "PATCH") return response(200, [{ id: "run-stale", status: "queued" }]);
    if (url.includes("/rest/v1/provider_crawl_events")) return response(201, []);
    if (url.includes("/rest/v1/provider_crawl_runs?select=*&status=eq.queued")) return response(200, []);
    if (url.includes("/rest/v1/provider_crawl_runs?select=*&status=in.(completed,partial)&error_code=eq.media_pending")) return response(200, []);
  } })
);
assert.equal(recoveredStaleRun.res.statusCode, 200, "Ein hängender Lauf kann vom Fallback-Worker wieder aufgenommen werden.");
assert.ok(recoveredStaleRun.calls.some((call) => call.url.includes("id=eq.run-stale&status=eq.running") && call.options.method === "PATCH"), "Stale running-Läufe werden nur mit einem Status-Guard wieder eingereiht.");

const deferredMedia = await invoke(
  { action: "process_next" },
  baseRoutes({ route: (url, options) => {
    if (url.includes("/rest/v1/provider_crawl_runs?select=*&status=eq.queued")) return response(200, []);
    if (url.includes("/rest/v1/provider_crawl_runs?select=*&status=in.(completed,partial)&error_code=eq.media_pending")) return response(200, [{ id: "run-media-pending", provider_id: "provider-media", website_snapshot: "https://example.test", status: "completed", error_code: "media_pending" }]);
    if (url.includes("/rest/v1/provider_crawl_runs?id=eq.run-media-pending&error_code=eq.media_pending") && options.method === "PATCH") return response(200, [{ id: "run-media-pending", provider_id: "provider-media", website_snapshot: "https://example.test", status: "completed", error_code: "media_running" }]);
    if (url.includes("/rest/v1/providers?")) return response(200, [{ id: "provider-media", website: "https://example.test", dashboard_created: true }]);
    if (url.includes("/rest/v1/provider_crawl_runs?id=eq.run-media-pending&error_code=eq.media_running") && options.method === "PATCH") return response(200, [{ id: "run-media-pending", status: "completed" }]);
  } })
);
assert.equal(deferredMedia.res.payload.media, "skipped", "Medien werden als eigene, nachgelagerte Stufe verarbeitet.");
assert.equal(deferredMedia.calls.some((call) => call.url === "https://example.test/"), false, "Für inzwischen angelegte Anbieter wird auch in der Medien-Stufe keine Website geladen.");

const signedMedia = await invoke(
  { action: "media_urls", runId: "run-media" },
  baseRoutes({ route: (url) => {
    if (url.includes("/rest/v1/provider_crawl_runs?select=id")) return response(200, [{ id: "run-media" }]);
    if (url.includes("/rest/v1/provider_crawl_media?select=")) return response(200, [{ id: "media-1", run_id: "run-media", media_kind: "logo", storage_bucket: "provider-crawler", storage_path: "provider/run/logo.png", source_url: "https://example.test/logo.png" }]);
    if (url.includes("/storage/v1/object/sign/provider-crawler/provider/run/logo.png")) return response(200, { signedURL: "/object/sign/provider-crawler/provider/run/logo.png?token=test" });
  } })
);
assert.equal(signedMedia.res.statusCode, 200, "AAL2-Admins können kurz gültige Bild-Links anfordern.");
assert.equal(signedMedia.res.payload.media[0].signed_url, "https://crawler-test.supabase.co/storage/v1/object/sign/provider-crawler/provider/run/logo.png?token=test", "Private Bildpfade werden nur als zeitlich begrenzte Server-Signatur ausgegeben.");

const editorialPages = [
  { url: "https://example.test/angebote", title: "Angebote", html: "<h1>Erlebnisse</h1><h2>Geführte Kajaktour</h2><a href=\"/angebote/kajak\">Geführte Kajaktour</a><p>Eine Tour auf dem See mit geschulten Guides.</p>", text: "Erlebnisse Geführte Kajaktour Eine Tour auf dem See mit geschulten Guides." },
  { url: "https://example.test/angebote/kajak", title: "Kajaktour", html: "<h1>Geführte Kajaktour</h1><p>Die Tour wird von erfahrenen Guides begleitet.</p>", text: "Geführte Kajaktour Die Tour wird von erfahrenen Guides begleitet." },
];
const editorialOffers = __providerCrawlerTestables.chooseOffers(editorialPages);
assert.ok(editorialOffers.some((offer) => offer.original_title === "Geführte Kajaktour"), "Angebote werden auch aus passenden Seitenüberschriften erkannt.");
const editorialSource = __providerCrawlerTestables.createEditorialSource(editorialPages, editorialOffers);
assert.equal(editorialSource[0].source_url, "https://example.test/angebote/kajak", "Relevante Angebotsseiten stehen im redaktionellen KI-Kontext vorn.");
const courseSources = __providerCrawlerTestables.createOfferEditorialSources(editorialOffers, editorialPages);
assert.equal(courseSources[0].source_pages[0].source_url, "https://example.test/angebote/kajak", "Jeder Kurs erhält seine konkrete Kursseite als vorrangige Textquelle.");
assert.equal(__providerCrawlerTestables.cleanEditorialText("Absatz eins\n\n\nAbsatz zwei"), "Absatz eins\n\nAbsatz zwei", "Redaktionelle Absätze bleiben beim Speichern erhalten.");

const marketplacePages = [
  { url: "https://example.test/angebote/gleitschirm-tandemflug", title: "Tandemflug", html: "<h1>Gleitschirm Tandemflug</h1><script type=\"application/ld+json\">{\"@type\":\"Product\",\"name\":\"Gleitschirm Tandemflug\",\"url\":\"https://example.test/angebote/gleitschirm-tandemflug\",\"location\":{\"@type\":\"Place\",\"address\":{\"streetAddress\":\"Höhenweg 12\",\"postalCode\":\"6020\",\"addressLocality\":\"Innsbruck\",\"addressCountry\":\"AT\"}}}</script>", text: "Gleitschirm Tandemflug Preis: ab 149 € Dauer: ca. 90 Minuten" },
  { url: "https://example.test/angebote", title: "Angebote", html: "<a href=\"/angebote/gleitschirm-tandemflug\">Gleitschirm Tandemflug</a><a href=\"/impressum\">Mehr Details</a>", text: "Angebote" },
];
const marketplaceOffers = __providerCrawlerTestables.chooseOffers(marketplacePages);
assert.equal(marketplaceOffers[0].original_title, "Gleitschirm Tandemflug", "Strukturierte Produktdaten haben Vorrang vor allgemeinen Übersichten.");
const marketplaceSources = __providerCrawlerTestables.createOfferEditorialSources(marketplaceOffers, marketplacePages);
assert.equal(marketplaceSources[0].facts.price.value, "ab 149 €", "Explizit genannte Preise werden als belegtes Angebotsmerkmal übernommen.");
assert.equal(marketplaceSources[0].facts.duration.value, "ca. 90 Minuten", "Explizit genannte Dauer wird als belegtes Angebotsmerkmal übernommen.");
assert.equal(marketplaceSources[0].facts.street.value, "Höhenweg", "Die Erlebnisstraße wird aus strukturierten Quelldaten übernommen.");
assert.equal(marketplaceSources[0].facts.house_number.value, "12", "Die Hausnummer des Erlebnisortes wird getrennt gespeichert.");
assert.equal(marketplaceSources[0].facts.city.value, "Innsbruck", "Der Ort des Erlebnisses wird als eigenes Feld übernommen.");
assert.ok(__providerCrawlerTestables.scoreCrawlerLink({ url: "https://example.test/angebote/kajak-tour", label: "Kajak Tour ab 89 €" }) > __providerCrawlerTestables.scoreCrawlerLink({ url: "https://example.test/kontakt", label: "Kontakt" }), "Konkrete Angebotsseiten werden vor Kontakt- und Infoseiten gecrawlt.");

const providerFacts = __providerCrawlerTestables.extractFacts([{ url: "https://example.test/", title: "Bergzeit Erlebnisse", html: "<script type=\"application/ld+json\">{\"@type\":\"Organization\",\"address\":{\"streetAddress\":\"Alpenstraße 7a\",\"postalCode\":\"5020\",\"addressLocality\":\"Salzburg\",\"addressCountry\":\"Österreich\"}}</script>", text: "Geschäftsführer: Maria Muster Tel: +43 662 123456 office@bergzeit.example" }]);
assert.equal(providerFacts.company_facts.managing_director_first_name.value, "Maria", "Vorname der Geschäftsführung wird getrennt gespeichert.");
assert.equal(providerFacts.company_facts.managing_director_last_name.value, "Muster", "Nachname der Geschäftsführung wird getrennt gespeichert.");
assert.equal(providerFacts.company_facts.street.value, "Alpenstraße", "Anbieterstraße wird getrennt gespeichert.");
assert.equal(providerFacts.company_facts.house_number.value, "7a", "Anbieterhausnummer wird getrennt gespeichert.");
assert.equal(providerFacts.company_facts.postal_code.value, "5020", "Anbieter-PLZ wird getrennt gespeichert.");

const nextPageHtml = '<script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"global":{"street":"Landstraße 34","zip_code":"5424","city":"Bad Vigaun","email":{"email":"info@example.test"}},"course":{"title":"Wintergrillen","description":"Ein Grillkurs für die kalte Jahreszeit."}}}}</script>';
const nextText = __providerCrawlerTestables.htmlToText(nextPageHtml);
assert.match(nextText, /Wintergrillen/, "In Next.js eingebettete Kursdaten bleiben als Crawl-Quelle erhalten.");
const nextFacts = __providerCrawlerTestables.extractFacts([{ url: "https://example.test/", title: "Englhartgut", html: nextPageHtml, text: nextText }]);
assert.equal(nextFacts.company_facts.street.value, "Landstraße", "CMS-Daten mit Straße und PLZ werden als Anbieteradresse verarbeitet.");
assert.equal(nextFacts.company_facts.house_number.value, "34", "CMS-Daten teilen die Hausnummer von der Straße ab.");
assert.equal(nextFacts.company_facts.city.value, "Bad Vigaun", "CMS-Daten liefern den Anbieterort.");
assert.ok(__providerCrawlerTestables.chooseOffers([{ url: "https://example.test/zeitlich-geplante-kurse/wintergrillen", title: "Wintergrillen", html: "<h1>Wintergrillen</h1>", text: "Wintergrillen" }]).length === 1, "Zeitlich geplante Kursseiten werden als Erlebnis erkannt.");

console.log("Anbieter-Crawler-API geprüft: Eligibility, Race-Check, getrennte Quellen und private Bild-Links.");
