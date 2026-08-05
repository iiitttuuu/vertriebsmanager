function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

function cleanText(value = "", maxLength = 180) {
  return String(value || "").replace(/\0/g, "").trim().slice(0, maxLength);
}

function sanitizeSupabaseUrl(value = "") {
  const normalized = String(value || "").trim().replace(/\/+$/, "");
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(normalized) ? normalized : "";
}

function getSupabaseConfig(req) {
  const requestedUrl = sanitizeSupabaseUrl(req?.headers?.["x-supabase-url"] || "");
  const environmentUrl = sanitizeSupabaseUrl(process.env.SUPABASE_URL || "");
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  return {
    supabaseUrl: requestedUrl || environmentUrl,
    serviceRoleKey,
    ready: Boolean((requestedUrl || environmentUrl) && serviceRoleKey),
  };
}

function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.trim()) return JSON.parse(req.body);
  return {};
}

async function authenticateSuperadmin(req, supabaseUrl, serviceRoleKey) {
  const authorization = String(req?.headers?.authorization || "").trim();
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return { ok: false, status: 401, error: "Nicht authentifiziert." };
  }
  const token = authorization.slice(7).trim();
  if (!token) {
    return { ok: false, status: 401, error: "Ungültiger Login-Token." };
  }
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${token}` },
  });
  const user = await userResponse.json().catch(() => null);
  const userId = String(user?.id || "").trim();
  if (!userResponse.ok || !userId) {
    return { ok: false, status: 401, error: "Login-Token ist abgelaufen oder ungültig." };
  }
  const profileResponse = await fetch(
    `${supabaseUrl}/rest/v1/profiles?select=role,status&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
    { headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` } }
  );
  const profiles = await profileResponse.json().catch(() => []);
  const profile = Array.isArray(profiles) ? profiles[0] : null;
  const role = String(profile?.role || "").trim().toLowerCase();
  const status = String(profile?.status || "").trim().toLowerCase();
  if (status !== "active" || !["superadmin", "supaadmin"].includes(role)) {
    return { ok: false, status: 403, error: "Kategorieanfragen dürfen nur von aktiven Superadmins gelöscht werden." };
  }
  return { ok: true };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }
  const { supabaseUrl, serviceRoleKey, ready } = getSupabaseConfig(req);
  if (!ready) {
    sendJson(res, 503, { error: "Die Server-Konfiguration ist unvollständig." });
    return;
  }
  try {
    const authorization = await authenticateSuperadmin(req, supabaseUrl, serviceRoleKey);
    if (!authorization.ok) {
      sendJson(res, authorization.status, { error: authorization.error });
      return;
    }
    const requestId = cleanText(parseBody(req)?.requestId);
    if (!requestId) {
      sendJson(res, 400, { error: "Kategorieanfrage ist ungültig." });
      return;
    }
    const deleteResponse = await fetch(
      `${supabaseUrl}/rest/v1/topic_requests?id=eq.${encodeURIComponent(requestId)}`,
      {
        method: "DELETE",
        headers: {
          apikey: serviceRoleKey,
          authorization: `Bearer ${serviceRoleKey}`,
          Prefer: "return=representation",
        },
      }
    );
    const deletedRows = await deleteResponse.json().catch(() => []);
    if (!deleteResponse.ok) {
      sendJson(res, deleteResponse.status || 500, { error: "Kategorieanfrage konnte nicht gelöscht werden." });
      return;
    }
    const deleted = Array.isArray(deletedRows) && deletedRows.some((entry) => String(entry?.id || "") === requestId);
    if (!deleted) {
      sendJson(res, 404, { error: "Kategorieanfrage wurde nicht gefunden oder bereits gelöscht." });
      return;
    }
    sendJson(res, 200, { deleted: true });
  } catch (error) {
    sendJson(res, 500, { error: "Kategorieanfrage konnte nicht gelöscht werden." });
  }
}
