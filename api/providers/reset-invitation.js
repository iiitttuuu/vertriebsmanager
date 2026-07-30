const INVITATION_FIELDS = [
  "invitationRequestStatus",
  "invitation_request_status",
  "invitationRequestedAt",
  "invitation_requested_at",
  "invitationRequestedByUserId",
  "invitation_requested_by_user_id",
  "invitationRequestedByName",
  "invitation_requested_by_name",
  "invitationRequestedByRole",
  "invitation_requested_by_role",
  "invitationInProgressAt",
  "invitation_in_progress_at",
  "invitationInProgressByUserId",
  "invitation_in_progress_by_user_id",
  "invitationInProgressByName",
  "invitation_in_progress_by_name",
  "invitationInProgressByRole",
  "invitation_in_progress_by_role",
  "invitationCompletedAt",
  "invitation_completed_at",
  "invitationCompletedByUserId",
  "invitation_completed_by_user_id",
  "invitationCompletedByName",
  "invitation_completed_by_name",
  "invitationCompletedByRole",
  "invitation_completed_by_role",
];

function sanitizeSupabaseUrl(value = "") {
  const normalized = String(value || "").trim().replace(/\/+$/, "");
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(normalized) ? normalized : "";
}

function getSupabaseConfig(req) {
  const requestSupabaseUrl = sanitizeSupabaseUrl(req?.headers?.["x-supabase-url"] || "");
  const environmentSupabaseUrl = sanitizeSupabaseUrl(process.env.SUPABASE_URL || "");
  const supabaseUrl = requestSupabaseUrl || environmentSupabaseUrl;
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  return { supabaseUrl, serviceRoleKey, ready: Boolean(supabaseUrl && serviceRoleKey) };
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

function isSuperadminRole(role = "") {
  const normalizedRole = String(role || "").trim().toLowerCase();
  return normalizedRole === "superadmin" || normalizedRole === "supaadmin";
}

function invitationRequestStatus(provider = {}) {
  const normalized = String(provider?.invitationRequestStatus || provider?.invitation_request_status || "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "_");
  if (["open", "offen", "pending", "angefordert"].includes(normalized)) return "open";
  if (["in_progress", "in_bearbeitung", "bearbeitung", "claimed"].includes(normalized)) return "in_progress";
  if (["completed", "complete", "done", "erledigt", "sent", "versendet"].includes(normalized)) return "completed";
  return "";
}

async function callSupabaseRest(supabaseUrl, serviceRoleKey, path, options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: String(options.method || "GET").toUpperCase(),
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
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

async function authenticateSuperadmin(req, supabaseUrl, serviceRoleKey) {
  const authorization = String(req?.headers?.authorization || "").trim();
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return { ok: false, status: 401, error: "Nicht authentifiziert." };
  }
  const accessToken = authorization.slice(7).trim();
  if (!accessToken) {
    return { ok: false, status: 401, error: "Ungültiger Login-Token." };
  }

  const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "GET",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${accessToken}`,
    },
  });
  const authPayload = await authResponse.json().catch(() => null);
  const userId = String(authPayload?.id || "").trim();
  if (!authResponse.ok || !isUuid(userId)) {
    return { ok: false, status: 401, error: "Login-Token ist abgelaufen oder ungültig." };
  }

  const profileResult = await callSupabaseRest(
    supabaseUrl,
    serviceRoleKey,
    `profiles?select=user_id,role,status&user_id=eq.${encodeURIComponent(userId)}&limit=1`
  );
  const profile = Array.isArray(profileResult.payload) ? profileResult.payload[0] : null;
  if (String(profile?.status || "").trim().toLowerCase() !== "active" || !isSuperadminRole(profile?.role)) {
    return { ok: false, status: 403, error: "Nur aktive Superadmins dürfen Einladungen zurücksetzen." };
  }
  return { ok: true, userId };
}

function resetInvitationFields(provider = {}) {
  const resetProvider = { ...provider };
  INVITATION_FIELDS.forEach((field) => {
    resetProvider[field] = "";
  });
  return resetProvider;
}

async function resetProviderInLegacyAppState(supabaseUrl, serviceRoleKey, providerId) {
  const stateResult = await callSupabaseRest(
    supabaseUrl,
    serviceRoleKey,
    "app_state?select=id,payload&id=eq.main&limit=1"
  );
  const stateRow = Array.isArray(stateResult.payload) ? stateResult.payload[0] : null;
  const statePayload = stateRow?.payload && typeof stateRow.payload === "object" ? stateRow.payload : null;
  const providers = Array.isArray(statePayload?.providers) ? statePayload.providers : [];
  const providerIndex = providers.findIndex((entry) => String(entry?.id || "").trim() === providerId);
  if (providerIndex < 0) return;

  const nextProviders = providers.slice();
  nextProviders[providerIndex] = resetInvitationFields(nextProviders[providerIndex]);
  const updateResult = await callSupabaseRest(supabaseUrl, serviceRoleKey, "app_state?id=eq.main", {
    method: "PATCH",
    body: { payload: { ...statePayload, providers: nextProviders } },
  });
  if (!updateResult.ok) {
    throw new Error("Der Sicherungsstand konnte nicht aktualisiert werden.");
  }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { supabaseUrl, serviceRoleKey, ready } = getSupabaseConfig(req);
  if (!ready) {
    res.status(503).json({ error: "Server-Konfiguration für das Zurücksetzen ist unvollständig." });
    return;
  }

  try {
    const authorization = await authenticateSuperadmin(req, supabaseUrl, serviceRoleKey);
    if (!authorization.ok) {
      res.status(authorization.status).json({ error: authorization.error });
      return;
    }

    const body = parseJsonBody(req);
    const providerId = String(body?.providerId || "").trim();
    if (!providerId || providerId.length > 200) {
      res.status(400).json({ error: "Ungültige Anbieter-ID." });
      return;
    }

    const providerResult = await callSupabaseRest(
      supabaseUrl,
      serviceRoleKey,
      `providers?select=id,name,payload,updated_at&id=eq.${encodeURIComponent(providerId)}&limit=2`
    );
    const providerRows = Array.isArray(providerResult.payload) ? providerResult.payload : [];
    if (!providerResult.ok || providerRows.length !== 1) {
      res.status(404).json({ error: "Anbieter wurde nicht gefunden." });
      return;
    }

    const providerRow = providerRows[0];
    const providerPayload =
      providerRow?.payload && typeof providerRow.payload === "object" && !Array.isArray(providerRow.payload)
        ? providerRow.payload
        : {};
    if (invitationRequestStatus(providerPayload) !== "completed") {
      res.status(409).json({ error: "Nur als erledigt markierte Einladungen können zurückgesetzt werden." });
      return;
    }

    const resetPayload = resetInvitationFields(providerPayload);
    const updatedAt = String(providerRow?.updated_at || "").trim();
    const updateResult = await callSupabaseRest(
      supabaseUrl,
      serviceRoleKey,
      `providers?id=eq.${encodeURIComponent(providerId)}&updated_at=eq.${encodeURIComponent(updatedAt)}`,
      { method: "PATCH", body: { payload: resetPayload } }
    );
    if (!updateResult.ok) {
      res.status(updateResult.status || 502).json({ error: "Einladung konnte nicht zurückgesetzt werden." });
      return;
    }
    if (!Array.isArray(updateResult.payload) || updateResult.payload.length !== 1) {
      res.status(409).json({ error: "Die Einladung wurde inzwischen geändert. Bitte Übersicht aktualisieren." });
      return;
    }

    try {
      await resetProviderInLegacyAppState(supabaseUrl, serviceRoleKey, providerId);
    } catch (legacyError) {
      console.warn("Provider invitation reset legacy state sync failed", legacyError);
    }
    res.status(200).json({
      provider: {
        id: providerId,
        name: String(providerRow?.name || "").trim(),
        invitationRequestStatus: "",
      },
    });
  } catch (error) {
    console.error("Provider invitation reset failed", error);
    res.status(500).json({ error: "Einladung konnte aktuell nicht zurückgesetzt werden." });
  }
}
