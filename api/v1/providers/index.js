import { timingSafeEqual } from "node:crypto";

const API_VERSION = "v1";
const PROVIDERS_TABLE = "providers";
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;
const PROVIDER_SELECT = [
  "id",
  "name",
  "status",
  "website",
  "email",
  "phone",
  "contact_salutation",
  "contact_title",
  "contact_first_name",
  "contact_last_name",
  "contact_person",
  "contact_person_phone",
  "contact_person_email",
  "address",
  "postal_code",
  "city",
  "state",
  "country",
  "locations",
  "coverage_mode",
  "coverage_country",
  "coverage_states",
  "topic_ids",
  "online_only",
  "responsible_user_id",
  "responsible_name",
  "responsible_role",
  "source_created_at",
  "source_updated_at",
  "created_at",
  "updated_at",
].join(",");

function sendMethodNotAllowed(res) {
  res.setHeader("allow", "GET");
  res.status(405).json({ error: "Method not allowed" });
}

function sanitizeSupabaseUrl(value = "") {
  const normalized = String(value || "").trim().replace(/\/+$/, "");
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(normalized) ? normalized : "";
}

function getConfig() {
  const supabaseUrl = sanitizeSupabaseUrl(process.env.SUPABASE_URL || "");
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const apiToken = String(process.env.PROVIDERS_READ_API_TOKEN || "").trim();
  return {
    supabaseUrl,
    serviceRoleKey,
    apiToken,
    ready: Boolean(supabaseUrl && serviceRoleKey && apiToken),
  };
}

function getBearerToken(value = "") {
  const authorization = String(value || "").trim();
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return "";
  }
  return authorization.slice(7).trim();
}

function tokensMatch(providedToken, configuredToken) {
  const provided = Buffer.from(String(providedToken || ""));
  const configured = Buffer.from(String(configuredToken || ""));
  return provided.length === configured.length && timingSafeEqual(provided, configured);
}

function parseInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(minimum, Math.min(maximum, parsed));
}

function getSingleQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function sanitizeExactFilter(value = "") {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }
  return /^[\p{L}\p{N}_ -]{1,80}$/u.test(normalized) ? normalized : null;
}

function sanitizeSearch(value = "") {
  return String(value || "")
    .replace(/[\\%_*,.()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function parseUpdatedSince(value = "") {
  const raw = String(value || "").trim();
  if (!raw) {
    return { value: "", error: "" };
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return { value: "", error: "updated_since muss ein gültiger ISO-8601-Zeitpunkt sein." };
  }
  return { value: date.toISOString(), error: "" };
}

function normalizeCoordinate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeLocation(location = {}) {
  return {
    address: String(location?.address || "").trim(),
    postal_code: String(location?.postalCode || location?.postal_code || "").trim(),
    city: String(location?.city || "").trim(),
    state: String(location?.state || "").trim(),
    country: String(location?.country || "").trim(),
    latitude: normalizeCoordinate(location?.latitude),
    longitude: normalizeCoordinate(location?.longitude),
  };
}

function buildProviderResponse(row = {}) {
  const contact = {
    salutation: String(row?.contact_salutation || "").trim(),
    title: String(row?.contact_title || "").trim(),
    first_name: String(row?.contact_first_name || "").trim(),
    last_name: String(row?.contact_last_name || "").trim(),
    full_name: String(row?.contact_person || "").trim(),
    email: String(row?.contact_person_email || "").trim(),
    phone: String(row?.contact_person_phone || "").trim(),
  };
  const hasContact = Object.values(contact).some(Boolean);
  const locations = Array.isArray(row?.locations) ? row.locations.map(normalizeLocation) : [];
  if (!locations.length) {
    locations.push(
      normalizeLocation({
        address: row?.address,
        postal_code: row?.postal_code,
        city: row?.city,
        state: row?.state,
        country: row?.country,
      })
    );
  }

  return {
    id: String(row?.id || "").trim(),
    name: String(row?.name || "").trim(),
    status: String(row?.status || "").trim(),
    website: String(row?.website || "").trim(),
    email: String(row?.email || "").trim(),
    phone: String(row?.phone || "").trim(),
    contact: hasContact ? contact : null,
    locations,
    coverage: {
      mode: String(row?.coverage_mode || "").trim(),
      country: String(row?.coverage_country || "").trim(),
      states: Array.isArray(row?.coverage_states) ? row.coverage_states.map((value) => String(value || "").trim()).filter(Boolean) : [],
    },
    topic_ids: Array.isArray(row?.topic_ids) ? row.topic_ids.map((value) => String(value || "").trim()).filter(Boolean) : [],
    online_only: Boolean(row?.online_only),
    responsible: {
      user_id: String(row?.responsible_user_id || "").trim(),
      name: String(row?.responsible_name || "").trim(),
      role: String(row?.responsible_role || "").trim(),
    },
    created_at: String(row?.source_created_at || row?.created_at || "").trim(),
    updated_at: String(row?.updated_at || row?.source_updated_at || "").trim(),
  };
}

function getTotalFromContentRange(value = "") {
  const match = String(value || "").match(/\/(\d+)$/);
  return match ? Number(match[1]) : null;
}

function isMissingProvidersTable(payload) {
  const detail = String(payload?.message || payload?.error || payload || "").toLowerCase();
  return detail.includes("providers") && detail.includes("does not exist");
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    sendMethodNotAllowed(res);
    return;
  }

  const { supabaseUrl, serviceRoleKey, apiToken, ready } = getConfig();
  if (!ready) {
    res.status(503).json({ error: "Die Anbieter-API ist noch nicht freigeschaltet." });
    return;
  }

  const providedToken = getBearerToken(req.headers?.authorization);
  if (!providedToken) {
    res.status(401).json({ error: "Bearer-Token fehlt." });
    return;
  }
  if (!tokensMatch(providedToken, apiToken)) {
    res.status(403).json({ error: "Bearer-Token ist ungültig." });
    return;
  }

  const id = String(getSingleQueryValue(req.query?.id) || "").trim();
  if (id && !/^[A-Za-z0-9_-]{1,200}$/.test(id)) {
    res.status(400).json({ error: "Ungültige Anbieter-ID." });
    return;
  }
  const status = sanitizeExactFilter(getSingleQueryValue(req.query?.status));
  const country = sanitizeExactFilter(getSingleQueryValue(req.query?.country));
  if (status === null || country === null) {
    res.status(400).json({ error: "Ungültiger Filterwert." });
    return;
  }
  const updatedSince = parseUpdatedSince(getSingleQueryValue(req.query?.updated_since));
  if (updatedSince.error) {
    res.status(400).json({ error: updatedSince.error });
    return;
  }

  const page = parseInteger(getSingleQueryValue(req.query?.page), 1, 1, 1000000);
  const pageSize = parseInteger(getSingleQueryValue(req.query?.page_size), DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  const params = new URLSearchParams({
    select: PROVIDER_SELECT,
    order: "updated_at.desc,id.asc",
    limit: String(pageSize),
    offset: String((page - 1) * pageSize),
    admin_only: "eq.false",
  });
  if (id) params.append("id", `eq.${id}`);
  if (status) params.append("status", `eq.${status}`);
  if (country) params.append("country", `eq.${country}`);
  const search = sanitizeSearch(getSingleQueryValue(req.query?.q));
  if (search) params.append("name", `ilike.*${search}*`);
  if (updatedSince.value) params.append("updated_at", `gt.${updatedSince.value}`);

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/${PROVIDERS_TABLE}?${params.toString()}`, {
      method: "GET",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        Accept: "application/json",
        Prefer: "count=exact",
      },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const error = isMissingProvidersTable(payload)
        ? "Die Anbieter-Tabelle ist im CRM noch nicht bereit."
        : "Anbieter konnten aktuell nicht geladen werden.";
      res.status(isMissingProvidersTable(payload) ? 503 : 502).json({ error });
      return;
    }

    const rows = Array.isArray(payload) ? payload : [];
    const total = getTotalFromContentRange(response.headers.get("content-range"));
    res.setHeader("cache-control", "private, no-store");
    res.status(200).json({
      api_version: API_VERSION,
      items: rows.map(buildProviderResponse),
      pagination: {
        page,
        page_size: pageSize,
        total,
        has_more: total === null ? rows.length === pageSize : page * pageSize < total,
      },
    });
  } catch (error) {
    console.error("Providers read API failed", error);
    res.status(502).json({ error: "Anbieter-API ist derzeit nicht erreichbar." });
  }
}
