function sendMethodNotAllowed(res) {
  res.status(405).json({ error: "Method not allowed" });
}

function getSupabaseConfig() {
  const supabaseUrl = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const bucket = String(process.env.SUPABASE_STORAGE_BUCKET_INCOMING || "incoming-documents").trim();
  return {
    supabaseUrl,
    serviceRoleKey,
    bucket,
    ready: Boolean(supabaseUrl && serviceRoleKey && bucket),
  };
}

function isUuid(value = "") {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
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

function sanitizeDownloadName(fileName = "") {
  const normalized = String(fileName || "beleg").trim();
  const withoutControls = normalized.replace(/[\r\n"]/g, "_");
  const withoutPath = withoutControls.replace(/[/\\]/g, "_");
  return withoutPath || "beleg";
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
  return { ok: true, userId, assuranceLevel: getJwtAssuranceLevel(accessToken) };
}

async function readAuthorizedProfile(userId, supabaseUrl, serviceRoleKey, assuranceLevel = "aal1") {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/profiles?select=user_id,role,status&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
    {
      method: "GET",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        Accept: "application/json",
      },
    }
  );
  if (!response.ok) {
    return { ok: false, status: 502, error: "Benutzerprofil konnte serverseitig nicht geprüft werden." };
  }

  const rows = await response.json().catch(() => []);
  const profile = Array.isArray(rows) ? rows[0] || null : null;
  const status = String(profile?.status || "").trim().toLowerCase();
  const role = String(profile?.role || "").trim().toLowerCase();
  const privilegedMfaMissing = isPrivilegedRole(role) && assuranceLevel !== "aal2";
  if (!profile || status !== "active" || !isPrivilegedRole(role) || privilegedMfaMissing) {
    return { ok: false, status: 403, error: "Dokument-Download ist nur für aktive Admins freigegeben." };
  }
  return { ok: true, profile };
}

function normalizeObjectPath(ref = "", bucket = "") {
  const normalizedRef = String(ref || "").trim().replace(/^\/+/, "");
  if (!normalizedRef) {
    return "";
  }
  const bucketPrefix = `${String(bucket || "").trim()}/`;
  if (bucketPrefix !== "/" && normalizedRef.startsWith(bucketPrefix)) {
    return normalizedRef.slice(bucketPrefix.length);
  }
  return normalizedRef;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    sendMethodNotAllowed(res);
    return;
  }

  const { supabaseUrl, serviceRoleKey, bucket, ready } = getSupabaseConfig();
  if (!ready) {
    res.status(503).json({ error: "Supabase Dokumentablage ist nicht vollständig konfiguriert." });
    return;
  }

  const ref = String(req.query?.ref || "").trim();
  const name = String(req.query?.name || "").trim();
  if (!ref) {
    res.status(400).json({ error: "Fehlender Dokumentverweis." });
    return;
  }

  try {
    const authResult = await authenticateUserWithSupabase(req.headers.authorization, supabaseUrl, serviceRoleKey);
    if (!authResult.ok) {
      res.status(authResult.status).json({ error: authResult.error });
      return;
    }
    const profileResult = await readAuthorizedProfile(authResult.userId, supabaseUrl, serviceRoleKey, authResult.assuranceLevel);
    if (!profileResult.ok) {
      res.status(profileResult.status).json({ error: profileResult.error });
      return;
    }

    const objectPath = normalizeObjectPath(ref, bucket);
    if (!objectPath) {
      res.status(400).json({ error: "Ungültiger Dokumentverweis." });
      return;
    }

    const storageUrl = `${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/")}`;
    const storageResponse = await fetch(storageUrl, {
      method: "GET",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    if (!storageResponse.ok) {
      const errorText = await storageResponse.text();
      res.status(storageResponse.status).json({ error: errorText || "Download fehlgeschlagen." });
      return;
    }

    const buffer = Buffer.from(await storageResponse.arrayBuffer());
    const responseContentType = String(storageResponse.headers.get("content-type") || "application/octet-stream");
    const responseContentDisposition =
      String(storageResponse.headers.get("content-disposition") || "").trim() ||
      `attachment; filename="${sanitizeDownloadName(name)}"`;

    res.setHeader("content-type", responseContentType);
    res.setHeader("content-disposition", responseContentDisposition);
    res.setHeader("cache-control", "private, no-store");
    res.status(200).send(buffer);
  } catch (error) {
    console.error("Supabase Download Fehler", error);
    res.status(502).json({ error: "Dokument-Download derzeit nicht erreichbar." });
  }
}
