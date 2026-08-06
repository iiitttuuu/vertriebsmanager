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
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(value || "").trim()
  );
}

function isPrivilegedRole(role = "") {
  const normalized = String(role || "").trim().toLowerCase();
  return normalized === "admin" || normalized === "superadmin" || normalized === "supaadmin";
}

function getJwtAssuranceLevel(accessToken = "") {
  try {
    const payload = String(accessToken || "").split(".")[1] || "";
    return String(JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))?.aal || "aal1").toLowerCase();
  } catch (_error) {
    return "aal1";
  }
}

function privilegedMfaSatisfied(role = "", assuranceLevel = "") {
  return !isPrivilegedRole(role) || assuranceLevel === "aal2";
}

function normalizeText(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeUserId(value = "") {
  return String(value || "").trim();
}

function normalizeComparablePhone(value = "") {
  return String(value || "").replace(/[^\d+]/g, "").replace(/^00/, "+");
}

function extractComparableWebsiteHost(value = "") {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return String(url.hostname || "").toLowerCase().replace(/^www\./, "");
  } catch (_error) {
    return raw.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || "";
  }
}

function normalizeProviderDedupPart(value = "") {
  return normalizeText(value).replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function pickField(row, names, fallback = "") {
  const candidates = Array.isArray(names) ? names : [names];
  for (const name of candidates) {
    if (Object.prototype.hasOwnProperty.call(row || {}, name)) {
      const value = row[name];
      if (value !== null && value !== undefined && String(value).trim()) {
        return String(value).trim();
      }
    }
  }
  return fallback;
}

function normalizePartnerRequestStatus(value = "") {
  const normalized = String(value || "").trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (["offen", "open", "neu", "new"].includes(normalized)) {
    return "offen";
  }
  if (["in_bearbeitung", "bearbeitung", "progress", "in_progress"].includes(normalized)) {
    return "in_bearbeitung";
  }
  if (["live", "geschlossen", "closed", "erledigt", "done", "processed", "bearbeitet"].includes(normalized)) {
    return "live";
  }
  return "";
}

function normalizeUserRole(role = "") {
  return String(role || "").trim().toLowerCase();
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
    const errorText = await response.text().catch(() => "");
    const normalizedError = String(errorText || "").toLowerCase();
    if (normalizedError.includes("invalid api key")) {
      return {
        ok: false,
        status: 503,
        error: "Server-Supabase-Key passt nicht zum konfigurierten Projekt.",
      };
    }
    return {
      ok: false,
      status: 401,
      error: "Login-Token ist abgelaufen oder ungültig.",
    };
  }
  const payload = await response.json().catch(() => null);
  const userId = String(payload?.id || "").trim();
  if (!isUuid(userId)) {
    return { ok: false, status: 401, error: "Ungültiger Benutzerkontext." };
  }
  return { ok: true, userId, assuranceLevel: getJwtAssuranceLevel(accessToken) };
}

async function callSupabaseRest(supabaseUrl, serviceRoleKey, path, options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: String(options.method || "GET").toUpperCase(),
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

function normalizeTableName(value = "") {
  const table = String(value || "partner_requests").trim();
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(table) ? table : "partner_requests";
}

function getProjectRefFromUrl(supabaseUrl = "") {
  const match = String(supabaseUrl || "").match(/^https:\/\/([^.]+)\.supabase\.co/i);
  return match ? match[1] : "";
}

function buildPartnerRequestsPath(table, limit) {
  const cappedLimit = Math.max(1, Math.min(5000, Number(limit || 1000)));
  return `${encodeURIComponent(table)}?select=*&order=created_at.desc.nullslast&limit=${cappedLimit}`;
}

function isMissingRelationError(errorLike = "", relationName = "") {
  const text = String(errorLike || "").toLowerCase();
  const normalizedRelation = String(relationName || "").trim().toLowerCase();
  return (
    text.includes("relation") &&
    text.includes("does not exist") &&
    (!normalizedRelation || text.includes(normalizedRelation))
  );
}

function buildProviderFromTableRow(row = {}) {
  const id = String(row?.id || row?.provider_id || "").trim();
  if (!id) {
    return null;
  }

  const locations = Array.isArray(row?.locations) ? row.locations : [];
  const primaryLocation = locations[0] || {
    address: String(row?.address || "").trim(),
    postalCode: String(row?.postal_code || row?.postalCode || "").trim(),
    city: String(row?.city || "").trim(),
    state: String(row?.state || "").trim(),
    country: String(row?.country || "").trim(),
    latitude: row?.latitude ?? null,
    longitude: row?.longitude ?? null,
  };

  const rowBackedProvider = {
    id,
    name: String(row?.name || "").trim(),
    status: String(row?.status || "").trim(),
    address: primaryLocation.address,
    postalCode: primaryLocation.postalCode,
    city: primaryLocation.city,
    state: primaryLocation.state,
    country: primaryLocation.country,
    website: String(row?.website || "").trim(),
    email: String(row?.email || "").trim(),
    phone: String(row?.phone || "").trim(),
    contactSalutation: String(row?.contact_salutation || "").trim(),
    contactTitle: String(row?.contact_title || "").trim(),
    contactFirstName: String(row?.contact_first_name || "").trim(),
    contactLastName: String(row?.contact_last_name || "").trim(),
    contactPerson: String(row?.contact_person || "").trim(),
    contactPersonPhone: String(row?.contact_person_phone || "").trim(),
    contactPersonEmail: String(row?.contact_person_email || "").trim(),
    topicIds: Array.isArray(row?.topic_ids) ? row.topic_ids : [],
    locations: locations.length ? locations : [primaryLocation],
    coverageMode: String(row?.coverage_mode || "").trim(),
    coverageCountry: String(row?.coverage_country || "").trim(),
    coverageStates: Array.isArray(row?.coverage_states) ? row.coverage_states : [],
    partnerRequestRedemptionMethod: String(row?.partner_request_redemption_method || "").trim(),
    partnerRequestMessage: String(row?.partner_request_message || "").trim(),
    responsibleUserId: String(row?.responsible_user_id || "").trim(),
    responsibleName: String(row?.responsible_name || "").trim(),
    responsibleRole: String(row?.responsible_role || "").trim(),
    sourcePartnerRequestId: String(row?.source_partner_request_id || "").trim(),
    linkedPartnerRequestIds: Array.isArray(row?.linked_partner_request_ids) ? row.linked_partner_request_ids : [],
  };

  const payload = row?.payload && typeof row.payload === "object" && !Array.isArray(row.payload) ? row.payload : null;
  return payload
    ? {
        ...payload,
        ...rowBackedProvider,
        id,
      }
    : rowBackedProvider;
}

async function authorizeActiveUser(req, supabaseUrl, serviceRoleKey) {
  const authResult = await authenticateUserWithSupabase(req.headers.authorization, supabaseUrl, serviceRoleKey);
  if (!authResult.ok) {
    return authResult;
  }

  const callerResult = await callSupabaseRest(
    supabaseUrl,
    serviceRoleKey,
    `profiles?select=user_id,role,status&user_id=eq.${encodeURIComponent(authResult.userId)}&limit=1`,
    { method: "GET" }
  );
  const callerProfile = Array.isArray(callerResult.payload) ? callerResult.payload[0] : null;
  const callerRole = String(callerProfile?.role || "").trim().toLowerCase();
  const callerStatus = String(callerProfile?.status || "").trim().toLowerCase();
  if (!callerProfile || callerStatus !== "active") {
    return { ok: false, status: 403, error: "Nur aktive Benutzer dürfen Partner-Anfragen öffnen." };
  }
  return {
    ok: true,
    userId: authResult.userId,
    role: callerRole,
    privileged: isPrivilegedRole(callerRole) && privilegedMfaSatisfied(callerRole, authResult.assuranceLevel),
  };
}

async function loadAppStateProviders(supabaseUrl, serviceRoleKey) {
  const providersResult = await callSupabaseRest(
    supabaseUrl,
    serviceRoleKey,
    "providers?select=*&order=updated_at.desc.nullslast",
    { method: "GET" }
  );
  if (Array.isArray(providersResult.payload)) {
    const providers = providersResult.payload.map((row) => buildProviderFromTableRow(row)).filter(Boolean);
    if (providers.length) {
      return providers;
    }
  } else if (!isMissingRelationError(JSON.stringify(providersResult.payload || ""), "providers")) {
    throw new Error(String(providersResult.payload?.message || providersResult.payload?.error || "Providers konnten nicht geladen werden."));
  }

  const stateResult = await callSupabaseRest(
    supabaseUrl,
    serviceRoleKey,
    "app_state?select=payload&id=eq.main&limit=1",
    { method: "GET" }
  );
  const stateRow = Array.isArray(stateResult.payload) ? stateResult.payload[0] : null;
  const payload = stateRow?.payload && typeof stateRow.payload === "object" ? stateRow.payload : {};
  return Array.isArray(payload.providers) ? payload.providers : [];
}

async function loadActiveProfileByUserId(supabaseUrl, serviceRoleKey, userId) {
  const normalizedUserId = normalizeUserId(userId);
  if (!isUuid(normalizedUserId)) {
    return null;
  }
  const profileResult = await callSupabaseRest(
    supabaseUrl,
    serviceRoleKey,
    `profiles?select=user_id,email,full_name,role,status&user_id=eq.${encodeURIComponent(normalizedUserId)}&limit=1`,
    { method: "GET" }
  );
  const profile = Array.isArray(profileResult.payload) ? profileResult.payload[0] : null;
  if (!profile || String(profile.status || "").trim().toLowerCase() !== "active") {
    return null;
  }
  return profile;
}

async function loadActiveProfilesForResponsibility(supabaseUrl, serviceRoleKey) {
  const profilesResult = await callSupabaseRest(
    supabaseUrl,
    serviceRoleKey,
    "profiles?select=user_id,email,full_name,role,status&status=eq.active",
    { method: "GET" }
  );
  const profiles = Array.isArray(profilesResult.payload) ? profilesResult.payload : [];
  return profiles
    .map((profile) => ({
      userId: normalizeUserId(profile?.user_id || ""),
      name: String(profile?.full_name || profile?.email || "Mitarbeiter").trim(),
      email: String(profile?.email || "").trim(),
      role: normalizeUserRole(profile?.role || "mitarbeiter"),
      status: String(profile?.status || "").trim().toLowerCase(),
    }))
    .filter((profile) => isUuid(profile.userId) && profile.status === "active")
    .sort((left, right) => left.name.localeCompare(right.name, "de"));
}

function mergeStringValues(...values) {
  const result = [];
  const append = (value) => {
    if (Array.isArray(value)) {
      value.forEach(append);
      return;
    }
    const text = String(value || "").trim();
    if (text && !result.includes(text)) {
      result.push(text);
    }
  };
  values.forEach(append);
  return result;
}

function getRequestDisplayName(row) {
  const company = pickField(row, [
    "company_name",
    "company",
    "firm_name",
    "business_name",
    "business",
    "provider_name",
    "partner_name",
    "name",
  ]);
  if (company) {
    return company;
  }
  return [pickField(row, ["first_name", "firstname", "vorname"]), pickField(row, ["last_name", "lastname", "nachname"])]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function getRequestMatchContext(row) {
  const id = pickField(row, ["id", "uuid", "request_id", "requestId"]);
  const name = getRequestDisplayName(row);
  return {
    id,
    persistedId: id,
    notificationId: id ? `partner_request_${id}` : "",
    nameKey: normalizeProviderDedupPart(name),
    email: normalizeText(pickField(row, ["email", "contact_email", "partner_email"])),
    phone: normalizeComparablePhone(pickField(row, ["phone", "phone_number", "telephone", "tel", "contact_phone"])),
    websiteHost: extractComparableWebsiteHost(pickField(row, ["website", "url", "homepage", "web", "site"])),
  };
}

function getProviderLinkedIds(provider) {
  return {
    requestIds: mergeStringValues(provider?.sourcePartnerRequestId, provider?.source_partner_request_id, provider?.linkedPartnerRequestIds, provider?.linked_partner_request_ids),
    persistedIds: mergeStringValues(provider?.sourcePartnerRequestPersistedId, provider?.source_partner_request_persisted_id, provider?.linkedPartnerRequestPersistedIds, provider?.linked_partner_request_persisted_ids),
    notificationIds: mergeStringValues(provider?.sourcePartnerRequestNotificationId, provider?.source_partner_request_notification_id, provider?.linkedPartnerRequestNotificationIds, provider?.linked_partner_request_notification_ids),
  };
}

function findProviderForPartnerRequest(row, providers = []) {
  const ctx = getRequestMatchContext(row);
  const candidates = providers
    .map((provider) => {
      const linked = getProviderLinkedIds(provider);
      const explicit =
        (ctx.id && linked.requestIds.includes(ctx.id)) ||
        (ctx.persistedId && linked.persistedIds.includes(ctx.persistedId)) ||
        (ctx.notificationId && linked.notificationIds.includes(ctx.notificationId));
      const providerEmail = normalizeText(provider?.email || provider?.contactPersonEmail || provider?.contact_person_email || "");
      const providerPhone = normalizeComparablePhone(provider?.phone || provider?.contactPersonPhone || provider?.contact_person_phone || "");
      const providerWebsiteHost = extractComparableWebsiteHost(provider?.website || "");
      const providerNameKey = normalizeProviderDedupPart(provider?.name || "");
      const emailMatch = !!ctx.email && providerEmail === ctx.email;
      const phoneMatch = !!ctx.phone && providerPhone === ctx.phone;
      const websiteMatch = !!ctx.websiteHost && providerWebsiteHost === ctx.websiteHost;
      const exactNameMatch = !!ctx.nameKey && providerNameKey === ctx.nameKey;
      let score = 0;
      if (explicit) score += 1000;
      if (emailMatch) score += 320;
      if (websiteMatch) score += 260;
      if (phoneMatch) score += 220;
      if (exactNameMatch) score += 180;
      return { provider, explicit, score, strong: explicit || emailMatch || websiteMatch || (exactNameMatch && phoneMatch) };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);
  if (!candidates.length) {
    return null;
  }
  const explicit = candidates.find((entry) => entry.explicit);
  if (explicit) {
    return explicit.provider;
  }
  if (candidates[0].strong && (!candidates[1] || candidates[0].score > candidates[1].score)) {
    return candidates[0].provider;
  }
  return null;
}

function normalizeProviderStatus(value = "") {
  const normalized = normalizeText(value).replace(/\s+/g, " ");
  if (["in bearbeitung", "in_bearbeitung", "bearbeitung"].includes(normalized)) {
    return "in Bearbeitung";
  }
  return String(value || "").trim();
}

function getLatestInProgressHistory(provider) {
  const history = Array.isArray(provider?.statusHistory)
    ? provider.statusHistory
    : Array.isArray(provider?.status_history)
      ? provider.status_history
      : [];
  return history
    .slice()
    .reverse()
    .find((entry) => normalizeProviderStatus(entry?.toStatus || entry?.to_status || "") === "in Bearbeitung") || null;
}

function getProviderResponsibleInfo(provider) {
  if (!provider) {
    return null;
  }
  const manualUserId = normalizeUserId(provider?.responsibleUserId || provider?.responsible_user_id || "");
  if (manualUserId) {
    const acceptanceStatus = String(provider?.responsibilityAcceptanceStatus || provider?.responsibility_acceptance_status || "").trim();
    if (acceptanceStatus === "pending") {
      const previousUserId = normalizeUserId(provider?.responsibilityPreviousUserId || provider?.responsibility_previous_user_id || "");
      if (previousUserId) {
        return {
          userId: previousUserId,
          name: String(provider?.responsibilityPreviousName || provider?.responsibility_previous_name || "").trim(),
          role: String(provider?.responsibilityPreviousRole || provider?.responsibility_previous_role || "").trim(),
          source: String(provider?.responsibilityPreviousSource || provider?.responsibility_previous_source || "manual").trim(),
          updatedAt: String(provider?.responsibilityPreviousUpdatedAt || provider?.responsibility_previous_updated_at || provider?.createdAt || provider?.created_at || "").trim(),
          providerId: String(provider?.id || provider?.provider_id || "").trim(),
        };
      }
    }
    return {
      userId: manualUserId,
      name: String(provider?.responsibleName || provider?.responsible_name || "").trim(),
      role: String(provider?.responsibleRole || provider?.responsible_role || "").trim(),
      source: "manual",
      updatedAt: String(provider?.responsibilityUpdatedAt || provider?.responsibility_updated_at || provider?.updatedAt || provider?.updated_at || "").trim(),
      providerId: String(provider?.id || provider?.provider_id || "").trim(),
    };
  }
  const status = normalizeProviderStatus(provider?.status || "");
  if (status === "in Bearbeitung") {
    const history = getLatestInProgressHistory(provider);
    const userId = normalizeUserId(provider?.inProgressByUserId || provider?.in_progress_by_user_id || history?.byUserId || history?.by_user_id || provider?.updatedByUserId || provider?.updated_by_user_id || provider?.createdByUserId || provider?.created_by_user_id);
    return {
      userId,
      name: String(provider?.inProgressByName || provider?.in_progress_by_name || history?.byName || history?.by_name || provider?.updatedByName || provider?.updated_by_name || provider?.createdByName || provider?.created_by_name || "").trim(),
      role: String(provider?.inProgressByRole || provider?.in_progress_by_role || history?.byRole || history?.by_role || provider?.updatedByRole || provider?.updated_by_role || provider?.createdByRole || provider?.created_by_role || "").trim(),
      source: "in_progress",
      updatedAt: String(provider?.inProgressAt || provider?.in_progress_at || history?.at || provider?.updatedAt || provider?.updated_at || "").trim(),
      providerId: String(provider?.id || provider?.provider_id || "").trim(),
    };
  }
  return {
    userId: normalizeUserId(provider?.createdByUserId || provider?.created_by_user_id || ""),
    name: String(provider?.createdByName || provider?.created_by_name || "").trim(),
    role: String(provider?.createdByRole || provider?.created_by_role || "").trim(),
    source: "created_by",
    updatedAt: String(provider?.createdAt || provider?.created_at || "").trim(),
    providerId: String(provider?.id || provider?.provider_id || "").trim(),
  };
}

function enrichPartnerRequestRow(row, providers = []) {
  const provider = findProviderForPartnerRequest(row, providers);
  const responsible = getProviderResponsibleInfo(provider);
  if (!responsible) {
    return { ...row };
  }
  return {
    ...row,
    linked_provider_id: responsible.providerId || "",
    responsible_user_id: responsible.userId || "",
    responsible_name: responsible.name || "",
    responsible_role: responsible.role || "",
    responsibility_source: responsible.source || "",
    responsibility_updated_at: responsible.updatedAt || "",
  };
}

function canUserSeePartnerRequest(row, providers, authResult) {
  if (authResult.privileged) {
    return true;
  }
  const enriched = enrichPartnerRequestRow(row, providers);
  const responsibleUserId = normalizeUserId(enriched.responsible_user_id || "");
  return Boolean(responsibleUserId && responsibleUserId === authResult.userId);
}

export default async function handler(req, res) {
  if (!["GET", "PATCH", "DELETE"].includes(req.method)) {
    sendMethodNotAllowed(res);
    return;
  }

  const { supabaseUrl, serviceRoleKey, ready } = getSupabaseConfig(req);
  if (!ready) {
    res.status(503).json({ error: "Server-Konfiguration für Partner-Anfragen ist unvollständig." });
    return;
  }

  try {
    const authResult = await authorizeActiveUser(req, supabaseUrl, serviceRoleKey);
    if (!authResult.ok) {
      res.status(authResult.status).json({ error: authResult.error });
      return;
    }

    const table = normalizeTableName(req.query?.table);

    if (req.method === "PATCH") {
      const body =
        typeof req.body === "string"
          ? JSON.parse(req.body || "{}")
          : req.body && typeof req.body === "object"
            ? req.body
            : {};
      const id = String(body?.id || req.query?.id || "").trim();
      const hasStatusUpdate = body?.status !== undefined || req.query?.status !== undefined;
      const status = normalizePartnerRequestStatus(body?.status || req.query?.status || "");
      const rawResponsibleUserId =
        body?.responsibleUserId ||
        body?.responsible_user_id ||
        body?.assigneeUserId ||
        body?.assignee_user_id ||
        req.query?.responsibleUserId ||
        req.query?.responsible_user_id ||
        "";
      const responsibleUserId = normalizeUserId(rawResponsibleUserId);
      const hasResponsibilityUpdate = Boolean(rawResponsibleUserId !== undefined && String(rawResponsibleUserId || "").trim());
      if (!id) {
        res.status(400).json({ error: "Partner-Anfrage ID fehlt." });
        return;
      }
      if (hasStatusUpdate && !status) {
        res.status(400).json({ error: "Ungültiger Status." });
        return;
      }
      if (!hasStatusUpdate && !hasResponsibilityUpdate) {
        res.status(400).json({ error: "Keine Änderung angegeben." });
        return;
      }
      const updateBody = {};
      if (hasStatusUpdate) {
        updateBody.status = status;
      }
      if (hasResponsibilityUpdate) {
        if (!authResult.privileged) {
          res.status(403).json({ error: "Nur Admin und Superadmin dürfen Verantwortlichkeiten übergeben." });
          return;
        }
        const targetProfile = await loadActiveProfileByUserId(supabaseUrl, serviceRoleKey, responsibleUserId);
        if (!targetProfile) {
          res.status(400).json({ error: "Ziel-Mitarbeiter ist nicht aktiv oder wurde nicht gefunden." });
          return;
        }
        updateBody.responsible_user_id = responsibleUserId;
        updateBody.responsible_name = String(targetProfile.full_name || targetProfile.email || "Mitarbeiter").trim();
        updateBody.responsible_role = normalizeUserRole(targetProfile.role || "mitarbeiter");
        updateBody.responsibility_source = "manual";
        updateBody.responsibility_updated_at = new Date().toISOString();
      }
      if (!authResult.privileged) {
        const rowCheck = await callSupabaseRest(
          supabaseUrl,
          serviceRoleKey,
          `${encodeURIComponent(table)}?select=*&id=eq.${encodeURIComponent(id)}&limit=1`,
          { method: "GET" }
        );
        const row = Array.isArray(rowCheck.payload) ? rowCheck.payload[0] : null;
        const providers = await loadAppStateProviders(supabaseUrl, serviceRoleKey);
        if (!row || !canUserSeePartnerRequest(row, providers, authResult)) {
          res.status(403).json({ error: "Keine Berechtigung für diese Formulareinreichung." });
          return;
        }
      }
      const updateResult = await callSupabaseRest(
        supabaseUrl,
        serviceRoleKey,
        `${encodeURIComponent(table)}?id=eq.${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          body: updateBody,
          prefer: "return=representation",
        }
      );
      if (!updateResult.ok) {
        const detail = String(updateResult.payload?.message || updateResult.payload || "").trim();
        const normalizedDetail = detail.toLowerCase();
        const missingStatusColumn = normalizedDetail.includes("status");
        const missingResponsibilityColumn =
          normalizedDetail.includes("responsible_") || normalizedDetail.includes("responsibility_");
        res.status(updateResult.status || 502).json({
          error: missingStatusColumn
            ? 'Status konnte nicht gespeichert werden. In "partner_requests" fehlt vermutlich die Spalte "status".'
            : missingResponsibilityColumn
              ? 'Verantwortlichkeit konnte nicht gespeichert werden. Bitte Supabase-Patch "patch_partner_requests_notifications.sql" ausführen.'
              : "Formulareinreichung konnte nicht gespeichert werden.",
        });
        return;
      }
      const providers = await loadAppStateProviders(supabaseUrl, serviceRoleKey);
      const updatedRow = Array.isArray(updateResult.payload) ? updateResult.payload[0] || null : updateResult.payload;
      res.setHeader("cache-control", "private, no-store");
      res.status(200).json({
        row: updatedRow ? enrichPartnerRequestRow(updatedRow, providers) : null,
        meta: {
          table,
          projectRef: getProjectRefFromUrl(supabaseUrl),
        },
      });
      return;
    }

    if (req.method === "DELETE") {
      if (!authResult.privileged) {
        res.status(403).json({ error: "Nur Admin und Superadmin dürfen Formulareinreichungen löschen." });
        return;
      }
      const body =
        typeof req.body === "string"
          ? JSON.parse(req.body || "{}")
          : req.body && typeof req.body === "object"
            ? req.body
            : {};
      const id = String(body?.id || req.query?.id || "").trim();
      if (!id) {
        res.status(400).json({ error: "Partner-Anfrage ID fehlt." });
        return;
      }
      const deleteResult = await callSupabaseRest(
        supabaseUrl,
        serviceRoleKey,
        `${encodeURIComponent(table)}?id=eq.${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          prefer: "return=representation",
        }
      );
      if (!deleteResult.ok) {
        res.status(deleteResult.status || 502).json({ error: "Partner-Anfrage konnte nicht gelöscht werden." });
        return;
      }
      res.setHeader("cache-control", "private, no-store");
      res.status(200).json({
        deleted: true,
        row: Array.isArray(deleteResult.payload) ? deleteResult.payload[0] || null : deleteResult.payload,
        meta: {
          table,
          projectRef: getProjectRefFromUrl(supabaseUrl),
        },
      });
      return;
    }

    let rowsResult = await callSupabaseRest(
      supabaseUrl,
      serviceRoleKey,
      buildPartnerRequestsPath(table, req.query?.limit),
      { method: "GET" }
    );
    if (
      !rowsResult.ok &&
      String(rowsResult.payload?.message || rowsResult.payload || "").toLowerCase().includes("created_at")
    ) {
      rowsResult = await callSupabaseRest(
        supabaseUrl,
        serviceRoleKey,
        `${encodeURIComponent(table)}?select=*&limit=${Math.max(1, Math.min(5000, Number(req.query?.limit || 1000)))}`,
        { method: "GET" }
      );
    }
    if (!rowsResult.ok) {
      res.status(rowsResult.status || 502).json({ error: "Partner-Anfragen konnten nicht geladen werden." });
      return;
    }

    const allRows = Array.isArray(rowsResult.payload) ? rowsResult.payload : [];
    const providers = await loadAppStateProviders(supabaseUrl, serviceRoleKey);
    const rows = allRows
      .filter((row) => canUserSeePartnerRequest(row, providers, authResult))
      .map((row) => enrichPartnerRequestRow(row, providers));
    const responsibleUsers = authResult.privileged
      ? await loadActiveProfilesForResponsibility(supabaseUrl, serviceRoleKey)
      : [];

    res.setHeader("cache-control", "private, no-store");
    res.status(200).json({
      rows,
      meta: {
        table,
        projectRef: getProjectRefFromUrl(supabaseUrl),
        scope: authResult.privileged ? "all" : "responsible",
        responsibleUsers,
      },
    });
  } catch (error) {
    console.error("Partner-Anfragen API Fehler", error);
    res.status(500).json({ error: "Serverfehler beim Laden der Partner-Anfragen." });
  }
}
