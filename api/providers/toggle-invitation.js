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

function normalizeRole(role = "") {
  const normalized = String(role || "").trim().toLowerCase();
  if (normalized === "supaadmin") return "superadmin";
  return normalized;
}

function isAdminRole(role = "") {
  return ["admin", "superadmin"].includes(normalizeRole(role));
}

function isAllowedRole(role = "") {
  return ["mitarbeiter", "vertriebsmitarbeiter", "admin", "superadmin"].includes(normalizeRole(role));
}

function isProviderInProgress(value = "") {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "_");
  return ["erfasst", "in_bearbeitung", "in_progress", "progress", "bearbeitung", "claimed"].includes(normalized);
}

function getInvitationStatus(provider = {}) {
  const normalized = String(provider?.invitationRequestStatus || provider?.invitation_request_status || "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "_");
  if (["open", "offen", "pending", "angefordert"].includes(normalized)) return "open";
  if (["in_progress", "in_bearbeitung", "bearbeitung", "claimed"].includes(normalized)) return "in_progress";
  if (["completed", "complete", "done", "erledigt", "sent", "versendet"].includes(normalized)) return "completed";
  return "";
}

function isInvitationOpen(provider = {}) {
  const status = getInvitationStatus(provider);
  return status === "open" || status === "in_progress";
}

function getProviderInProgressClaimUserId(providerRow = {}, providerPayload = {}) {
  return String(
    providerRow?.in_progress_by_user_id ||
      providerPayload?.inProgressByUserId ||
      providerPayload?.in_progress_by_user_id ||
      ""
  ).trim();
}

function clearInvitationFields(provider = {}) {
  const nextProvider = { ...provider };
  INVITATION_FIELDS.forEach((field) => {
    nextProvider[field] = "";
  });
  return nextProvider;
}

function createOpenInvitationPayload(provider = {}, actor, timestamp) {
  return {
    ...clearInvitationFields(provider),
    invitationRequestStatus: "open",
    invitation_request_status: "open",
    invitationRequestedAt: timestamp,
    invitation_requested_at: timestamp,
    invitationRequestedByUserId: actor.userId,
    invitation_requested_by_user_id: actor.userId,
    invitationRequestedByName: actor.name,
    invitation_requested_by_name: actor.name,
    invitationRequestedByRole: actor.role,
    invitation_requested_by_role: actor.role,
    updatedAt: timestamp,
    updatedByUserId: actor.userId,
    updatedByName: actor.name,
    updatedByRole: actor.role,
  };
}

function createCancelledInvitationPayload(provider = {}, actor, timestamp) {
  return {
    ...clearInvitationFields(provider),
    updatedAt: timestamp,
    updatedByUserId: actor.userId,
    updatedByName: actor.name,
    updatedByRole: actor.role,
  };
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

async function authenticateActiveUser(req, supabaseUrl, serviceRoleKey) {
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
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${accessToken}` },
  });
  const authPayload = await authResponse.json().catch(() => null);
  const userId = String(authPayload?.id || "").trim();
  if (!authResponse.ok || !isUuid(userId)) {
    return { ok: false, status: 401, error: "Login-Token ist abgelaufen oder ungültig." };
  }

  const profileResult = await callSupabaseRest(
    supabaseUrl,
    serviceRoleKey,
    `profiles?select=user_id,full_name,email,role,status&user_id=eq.${encodeURIComponent(userId)}&limit=1`
  );
  const profile = Array.isArray(profileResult.payload) ? profileResult.payload[0] : null;
  const role = normalizeRole(profile?.role);
  if (String(profile?.status || "").trim().toLowerCase() !== "active" || !isAllowedRole(role)) {
    return { ok: false, status: 403, error: "Nur aktive Mitarbeiter, Vertriebsmitarbeiter, Admins und Superadmins dürfen Einladungen ändern." };
  }

  return {
    ok: true,
    actor: {
      userId,
      name: String(profile?.full_name || profile?.email || "Mitarbeiter").trim(),
      role,
    },
  };
}

async function updateLegacyAppState(supabaseUrl, serviceRoleKey, providerId, nextProviderPayload) {
  const stateResult = await callSupabaseRest(
    supabaseUrl,
    serviceRoleKey,
    "app_state?select=id,payload&id=eq.main&limit=1"
  );
  const stateRow = Array.isArray(stateResult.payload) ? stateResult.payload[0] : null;
  const statePayload = stateRow?.payload && typeof stateRow.payload === "object" ? stateRow.payload : null;
  const providers = Array.isArray(statePayload?.providers) ? statePayload.providers : [];
  const providerIndex = providers.findIndex((entry) => String(entry?.id || "").trim() === providerId);
  if (!statePayload || providerIndex < 0) return;

  const nextProviders = providers.slice();
  nextProviders[providerIndex] = {
    ...nextProviders[providerIndex],
    ...nextProviderPayload,
    id: providerId,
  };
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
    res.status(503).json({ error: "Server-Konfiguration für Einladungen ist unvollständig." });
    return;
  }

  try {
    const authorization = await authenticateActiveUser(req, supabaseUrl, serviceRoleKey);
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
    if (typeof body?.enabled !== "boolean") {
      res.status(400).json({ error: "Ungültiger Schalterwert." });
      return;
    }

    const providerResult = await callSupabaseRest(
      supabaseUrl,
      serviceRoleKey,
      `providers?select=id,name,payload,status,in_progress_by_user_id,in_progress_by_name,in_progress_by_role,in_progress_at,updated_at&id=eq.${encodeURIComponent(providerId)}&limit=2`
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
    const providerStatus = String(providerRow?.status || providerPayload?.status || "").trim();
    if (!isProviderInProgress(providerStatus)) {
      res.status(409).json({ error: "Die Einladung ist nur verfügbar, solange der Anbieter auf „In Bearbeitung“ steht." });
      return;
    }

    const claimUserId = getProviderInProgressClaimUserId(providerRow, providerPayload);
    if (!isAdminRole(authorization.actor.role) && (!claimUserId || claimUserId !== authorization.actor.userId)) {
      res.status(403).json({ error: "Nur die Person, die „In Bearbeitung“ gesetzt hat, darf diese Einladung ändern." });
      return;
    }

    const invitationOpen = isInvitationOpen(providerPayload);
    if (!body.enabled && !invitationOpen) {
      res.status(409).json({ error: "Diese Einladung ist nicht mehr offen." });
      return;
    }

    const timestamp = new Date().toISOString();
    const nextProviderPayload = body.enabled
      ? createOpenInvitationPayload(providerPayload, authorization.actor, timestamp)
      : createCancelledInvitationPayload(providerPayload, authorization.actor, timestamp);

    // Optimistisches Locking: Zwischen Lesen und Schreiben darf weder der
    // Status/Claim noch irgendeine andere Änderung an diesem Anbieter erfolgt
    // sein. Sonst könnte ein alter Request eine Einladung auf einen inzwischen
    // umgehängten oder abgeschlossenen Vorgang schreiben.
    const updateFilters = [
      `id=eq.${encodeURIComponent(providerId)}`,
      `status=eq.${encodeURIComponent(providerStatus)}`,
      `updated_at=eq.${encodeURIComponent(String(providerRow?.updated_at || "").trim())}`,
    ];
    if (!isAdminRole(authorization.actor.role)) {
      updateFilters.push(`in_progress_by_user_id=eq.${encodeURIComponent(authorization.actor.userId)}`);
    }
    const updateResult = await callSupabaseRest(
      supabaseUrl,
      serviceRoleKey,
      `providers?${updateFilters.join("&")}`,
      {
        method: "PATCH",
        body: {
          payload: nextProviderPayload,
          source_updated_at: timestamp,
          updated_by_user_id: authorization.actor.userId,
          updated_by_name: authorization.actor.name,
          updated_by_role: authorization.actor.role,
        },
      }
    );
    if (!updateResult.ok) {
      res.status(updateResult.status || 502).json({ error: "Einladung konnte nicht gespeichert werden." });
      return;
    }
    if (!Array.isArray(updateResult.payload) || updateResult.payload.length !== 1) {
      res.status(409).json({
        error: "Der Anbieter wurde inzwischen geändert. Bitte aktualisiere die Übersicht und versuche es erneut.",
      });
      return;
    }

    try {
      await updateLegacyAppState(supabaseUrl, serviceRoleKey, providerId, nextProviderPayload);
    } catch (legacyError) {
      // Die providers-Tabelle ist die führende Quelle. Ein alter
      // Sicherungsstand darf eine erfolgreich gesicherte Einladung nicht
      // zurückrollen oder dem Nutzer fälschlich als Fehler erscheinen lassen.
      console.warn("Provider invitation legacy state sync failed", legacyError);
    }

    res.status(200).json({
      provider: {
        ...nextProviderPayload,
        id: providerId,
        name: String(providerRow?.name || nextProviderPayload?.name || "").trim(),
        status: providerStatus,
        inProgressByUserId: String(providerRow?.in_progress_by_user_id || "").trim(),
        in_progress_by_user_id: String(providerRow?.in_progress_by_user_id || "").trim(),
        inProgressByName: String(providerRow?.in_progress_by_name || "").trim(),
        in_progress_by_name: String(providerRow?.in_progress_by_name || "").trim(),
        inProgressByRole: String(providerRow?.in_progress_by_role || "").trim(),
        in_progress_by_role: String(providerRow?.in_progress_by_role || "").trim(),
        inProgressAt: String(providerRow?.in_progress_at || "").trim(),
        in_progress_at: String(providerRow?.in_progress_at || "").trim(),
      },
    });
  } catch (error) {
    console.error("Provider invitation toggle failed", error);
    res.status(500).json({ error: "Einladung konnte aktuell nicht gespeichert werden." });
  }
}
