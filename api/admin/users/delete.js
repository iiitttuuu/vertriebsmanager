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
  const body = options.body === undefined ? null : options.body;
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation",
      ...(options.headers || {}),
    },
    body: body === null ? undefined : JSON.stringify(body),
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

function isPrivilegedRole(role = "") {
  const normalized = String(role || "").trim().toLowerCase();
  return normalized === "admin" || normalized === "superadmin" || normalized === "supaadmin";
}

async function removeUserFromConversationParticipants(supabaseUrl, serviceRoleKey, targetUserId) {
  const selectPath =
    `conversation_threads?select=id,internal_participant_user_ids` +
    `&internal_participant_user_ids=cs.%7B${encodeURIComponent(targetUserId)}%7D`;
  const rowsResult = await callSupabaseRest(supabaseUrl, serviceRoleKey, selectPath, { method: "GET" });
  if (!rowsResult.ok || !Array.isArray(rowsResult.payload) || !rowsResult.payload.length) {
    return;
  }
  for (const row of rowsResult.payload) {
    const threadId = String(row?.id || "").trim();
    if (!threadId) {
      continue;
    }
    const participants = Array.isArray(row?.internal_participant_user_ids)
      ? row.internal_participant_user_ids.map((entry) => String(entry || "").trim()).filter(Boolean)
      : [];
    const nextParticipants = participants.filter((entry) => entry !== targetUserId);
    if (nextParticipants.length === participants.length) {
      continue;
    }
    await callSupabaseRest(
      supabaseUrl,
      serviceRoleKey,
      `conversation_threads?id=eq.${encodeURIComponent(threadId)}`,
      {
        method: "PATCH",
        prefer: "return=minimal",
        body: { internal_participant_user_ids: nextParticipants },
      }
    );
  }
}

async function deleteAuthUser(supabaseUrl, serviceRoleKey, targetUserId) {
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(targetUserId)}`, {
    method: "DELETE",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
  });
  if (response.ok) {
    return { ok: true };
  }
  const errorPayload = await response.json().catch(() => null);
  const message = String(errorPayload?.error || errorPayload?.msg || "").trim();
  if (response.status === 404) {
    return { ok: true };
  }
  return {
    ok: false,
    status: response.status,
    error: message || `Auth-Löschung fehlgeschlagen (HTTP ${response.status}).`,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendMethodNotAllowed(res);
    return;
  }

  const { supabaseUrl, serviceRoleKey, ready } = getSupabaseConfig(req);
  if (!ready) {
    res.status(503).json({ error: "Server-Konfiguration für Benutzer-Löschung ist unvollständig." });
    return;
  }

  try {
    const authResult = await authenticateUserWithSupabase(req.headers.authorization, supabaseUrl, serviceRoleKey);
    if (!authResult.ok) {
      res.status(authResult.status).json({ error: authResult.error });
      return;
    }

    const body = await parseJsonBody(req);
    const targetUserId = String(body?.userId || "").trim().toLowerCase();
    if (!isUuid(targetUserId)) {
      res.status(400).json({ error: "Ungültige Ziel-Benutzer-ID." });
      return;
    }
    if (targetUserId === authResult.userId) {
      res.status(400).json({ error: "Eigenen Benutzer kann man nicht löschen." });
      return;
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
    if (!callerProfile || callerStatus !== "active" || !isPrivilegedRole(callerRole)) {
      res.status(403).json({ error: "Nur aktive Admins dürfen Benutzer löschen." });
      return;
    }

    const targetProfileResult = await callSupabaseRest(
      supabaseUrl,
      serviceRoleKey,
      `profiles?select=user_id,email,role,status&user_id=eq.${encodeURIComponent(targetUserId)}&limit=1`,
      { method: "GET" }
    );
    const targetProfile = Array.isArray(targetProfileResult.payload) ? targetProfileResult.payload[0] : null;
    const targetRole = String(targetProfile?.role || "").trim().toLowerCase();
    const targetStatus = String(targetProfile?.status || "").trim().toLowerCase();
    const targetEmail = String(targetProfile?.email || "").trim().toLowerCase();

    if ((targetRole === "superadmin" || targetRole === "supaadmin") && callerRole !== "superadmin") {
      res.status(403).json({ error: "Nur Superadmin darf Superadmin löschen." });
      return;
    }

    if (isPrivilegedRole(targetRole) && targetStatus === "active") {
      const activePrivilegedResult = await callSupabaseRest(
        supabaseUrl,
        serviceRoleKey,
        "profiles?select=user_id&status=eq.active&role=in.(admin,superadmin,supaadmin)",
        { method: "GET" }
      );
      const activePrivilegedRows = Array.isArray(activePrivilegedResult.payload) ? activePrivilegedResult.payload : [];
      if (activePrivilegedRows.length <= 1) {
        res.status(409).json({ error: "Der letzte aktive Admin/Superadmin kann nicht gelöscht werden." });
        return;
      }
    }

    await removeUserFromConversationParticipants(supabaseUrl, serviceRoleKey, targetUserId);

    if (targetEmail) {
      await callSupabaseRest(
        supabaseUrl,
        serviceRoleKey,
        `employee_invites?email=eq.${encodeURIComponent(targetEmail)}`,
        { method: "DELETE", prefer: "return=minimal" }
      );
    }

    const deleteResult = await deleteAuthUser(supabaseUrl, serviceRoleKey, targetUserId);
    if (!deleteResult.ok) {
      res.status(deleteResult.status || 500).json({ error: deleteResult.error || "Benutzer konnte nicht gelöscht werden." });
      return;
    }

    res.status(200).json({ ok: true, deletedUserId: targetUserId });
  } catch (error) {
    console.error("Admin delete user failed", error);
    res.status(500).json({ error: "Serverfehler bei vollständiger Benutzer-Löschung." });
  }
}
