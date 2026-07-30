function sendMethodNotAllowed(res) {
  res.status(405).json({ error: "Method not allowed" });
}

function sanitizeSupabaseUrl(value = "") {
  const normalized = String(value || "").trim().replace(/\/+$/, "");
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(normalized)) {
    return "";
  }
  return normalized;
}

function getSupabaseConfig(req) {
  const requestSupabaseUrl = sanitizeSupabaseUrl(req?.headers?.["x-supabase-url"] || "");
  const envSupabaseUrl = sanitizeSupabaseUrl(process.env.SUPABASE_URL || "");
  const supabaseUrl = requestSupabaseUrl || envSupabaseUrl;
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  return {
    supabaseUrl,
    serviceRoleKey,
    ready: Boolean(supabaseUrl && serviceRoleKey),
  };
}

function isUuid(value = "") {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "").trim()
  );
}

async function parseJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  if (typeof req.body === "string" && req.body.trim()) {
    return JSON.parse(req.body);
  }
  return {};
}

async function authenticateUserWithSupabase(userAuthorizationHeader, supabaseUrl, serviceRoleKey) {
  const authHeader = String(userAuthorizationHeader || "").trim();
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return { ok: false, status: 401, error: "Nicht authentifiziert." };
  }
  const accessToken = authHeader.slice(7).trim();
  if (!accessToken) {
    return { ok: false, status: 401, error: "Ungültiger Login-Token." };
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "GET",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    return { ok: false, status: 401, error: "Login-Token ist abgelaufen oder ungültig." };
  }
  const payload = await response.json().catch(() => null);
  const userId = String(payload?.id || "").trim();
  if (!isUuid(userId)) {
    return { ok: false, status: 401, error: "Ungültiger Benutzerkontext." };
  }
  return { ok: true, userId };
}

async function callSupabaseRest(supabaseUrl, serviceRoleKey, path, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation",
      ...(options.headers || {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch (_error) {
    payload = text || null;
  }
  return { ok: response.ok, status: response.status, payload };
}

async function authorizeActiveUser(req, supabaseUrl, serviceRoleKey) {
  const authResult = await authenticateUserWithSupabase(req.headers.authorization, supabaseUrl, serviceRoleKey);
  if (!authResult.ok) {
    return authResult;
  }

  const profileResult = await callSupabaseRest(
    supabaseUrl,
    serviceRoleKey,
    `profiles?select=user_id,role,status&user_id=eq.${encodeURIComponent(authResult.userId)}&limit=1`,
    { method: "GET" }
  );
  const profile = Array.isArray(profileResult.payload) ? profileResult.payload[0] : null;
  const status = String(profile?.status || "").trim().toLowerCase();
  const role = String(profile?.role || "").trim().toLowerCase();
  if (!profile || status !== "active") {
    return { ok: false, status: 403, error: "Nur aktive Benutzer dürfen Anbieter-Notizen löschen." };
  }
  return {
    ok: true,
    userId: authResult.userId,
    role,
    privileged: role === "admin" || role === "superadmin" || role === "supaadmin",
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendMethodNotAllowed(res);
    return;
  }

  const { supabaseUrl, serviceRoleKey, ready } = getSupabaseConfig(req);
  if (!ready) {
    res.status(503).json({ error: "Server-Konfiguration für Anbieter-Notizen ist unvollständig." });
    return;
  }

  try {
    const authResult = await authorizeActiveUser(req, supabaseUrl, serviceRoleKey);
    if (!authResult.ok) {
      res.status(authResult.status).json({ error: authResult.error });
      return;
    }

    const body = await parseJsonBody(req);
    const noteId = String(body?.noteId || "").trim();
    const providerId = String(body?.providerId || "").trim();
    if (!isUuid(noteId) || !providerId) {
      res.status(400).json({ error: "Ungültige Notiz- oder Anbieter-ID." });
      return;
    }

    const deleteResult = await callSupabaseRest(
      supabaseUrl,
      serviceRoleKey,
      authResult.privileged
        ? `provider_notes?id=eq.${encodeURIComponent(noteId)}&provider_id=eq.${encodeURIComponent(providerId)}`
        : `provider_notes?id=eq.${encodeURIComponent(noteId)}&provider_id=eq.${encodeURIComponent(providerId)}&created_by_user_id=eq.${encodeURIComponent(authResult.userId)}`,
      { method: "DELETE", prefer: "return=representation" }
    );
    if (!deleteResult.ok) {
      res.status(deleteResult.status || 500).json({
        error: "Anbieter-Notiz konnte serverseitig nicht gelöscht werden.",
        detail: deleteResult.payload,
      });
      return;
    }

    const deletedRows = Array.isArray(deleteResult.payload) ? deleteResult.payload : [];
    res.status(200).json({ ok: true, deleted: deletedRows.length });
  } catch (error) {
    res.status(500).json({
      error: "Anbieter-Notiz konnte nicht gelöscht werden.",
      detail: error?.message || String(error),
    });
  }
}
