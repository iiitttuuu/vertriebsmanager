const TOPIC_SUBTOPICS_TABLE = "topic_subtopics";

function sanitizeSupabaseUrl(value = "") {
  const normalized = String(value || "").trim().replace(/\/+$/, "");
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(normalized) ? normalized : "";
}

function parseJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.trim()) return JSON.parse(req.body);
  return {};
}

function isUuid(value = "") {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "").trim()
  );
}

function normalizeName(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizeRole(role = "") {
  const normalized = String(role || "").trim().toLowerCase();
  return normalized === "supaadmin" ? "superadmin" : normalized;
}

function isAdminRole(role = "") {
  return ["admin", "superadmin"].includes(normalizeRole(role));
}

function getSupabaseConfig(req) {
  const requestSupabaseUrl = sanitizeSupabaseUrl(req?.headers?.["x-supabase-url"] || "");
  const environmentSupabaseUrl = sanitizeSupabaseUrl(process.env.SUPABASE_URL || "");
  const supabaseUrl = requestSupabaseUrl || environmentSupabaseUrl;
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  return { supabaseUrl, serviceRoleKey, ready: Boolean(supabaseUrl && serviceRoleKey) };
}

async function callSupabaseRest(supabaseUrl, serviceRoleKey, path, options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: String(options.method || "GET").toUpperCase(),
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
      Prefer: "return=representation",
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const payload = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, payload };
}

async function authenticateAdmin(req, supabaseUrl, serviceRoleKey) {
  const authorization = String(req?.headers?.authorization || "").trim();
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return { ok: false, status: 401, error: "Nicht authentifiziert." };
  }
  const accessToken = authorization.slice(7).trim();
  const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${accessToken}` },
  });
  const authPayload = await authResponse.json().catch(() => null);
  const userId = String(authPayload?.id || "").trim();
  if (!authResponse.ok || !isUuid(userId)) {
    return { ok: false, status: 401, error: "Login-Token ist abgelaufen oder ungültig." };
  }
  const profilesResult = await callSupabaseRest(
    supabaseUrl,
    serviceRoleKey,
    `profiles?select=role,status&user_id=eq.${encodeURIComponent(userId)}&limit=1`
  );
  const profile = Array.isArray(profilesResult.payload) ? profilesResult.payload[0] : null;
  if (String(profile?.status || "").trim().toLowerCase() !== "active" || !isAdminRole(profile?.role)) {
    return { ok: false, status: 403, error: "Nur aktive Administratoren dürfen Sub-Themen umbenennen." };
  }
  return { ok: true };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const { supabaseUrl, serviceRoleKey, ready } = getSupabaseConfig(req);
  if (!ready) {
    res.status(503).json({ error: "Server-Konfiguration für Sub-Themen ist unvollständig." });
    return;
  }
  try {
    const authorization = await authenticateAdmin(req, supabaseUrl, serviceRoleKey);
    if (!authorization.ok) {
      res.status(authorization.status).json({ error: authorization.error });
      return;
    }
    const body = parseJsonBody(req);
    const subtopicId = String(body?.subtopicId || "").trim();
    const topicId = String(body?.topicId || "").trim();
    const name = String(body?.name || "").trim().slice(0, 120);
    const normalizedName = normalizeName(name);
    if (!isUuid(subtopicId) || !topicId || topicId.length > 200 || !normalizedName) {
      res.status(400).json({ error: "Ungültige Angaben für das Sub-Thema." });
      return;
    }
    const updateResult = await callSupabaseRest(
      supabaseUrl,
      serviceRoleKey,
      `${TOPIC_SUBTOPICS_TABLE}?id=eq.${encodeURIComponent(subtopicId)}&topic_id=eq.${encodeURIComponent(topicId)}`,
      { method: "PATCH", body: { name, normalized_name: normalizedName } }
    );
    const updated = Array.isArray(updateResult.payload) ? updateResult.payload[0] : null;
    if (!updateResult.ok || !updated || String(updated.id || "").trim() !== subtopicId) {
      const message = String(updateResult.payload?.message || updateResult.payload?.hint || "Sub-Thema konnte nicht gespeichert werden.");
      res.status(updateResult.status || 502).json({ error: message });
      return;
    }
    if (String(updated.name || "").trim() !== name || String(updated.normalized_name || "").trim() !== normalizedName) {
      res.status(502).json({ error: "Sub-Thema wurde vom Server nicht mit dem neuen Namen bestätigt." });
      return;
    }
    res.status(200).json({
      subtopic: {
        id: subtopicId,
        topic_id: topicId,
        name,
        normalized_name: normalizedName,
      },
    });
  } catch (error) {
    console.error("Topic subtopic rename failed", error);
    res.status(500).json({ error: "Sub-Thema konnte aktuell nicht gespeichert werden." });
  }
}
