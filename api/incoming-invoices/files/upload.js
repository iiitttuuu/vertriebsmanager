export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function getEnvironmentSecret(value) {
  const normalized = String(value || "").trim();
  return ["", "\"\"", "''", "undefined", "null"].includes(normalized.toLowerCase()) ? "" : normalized;
}

function sendMethodNotAllowed(res) {
  res.status(405).json({ error: "Method not allowed" });
}

function getSupabaseConfig() {
  const supabaseUrl = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const serviceRoleKey = getEnvironmentSecret(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const bucket = String(process.env.SUPABASE_STORAGE_BUCKET_INCOMING || "incoming-documents").trim();
  return {
    supabaseUrl,
    serviceRoleKey,
    bucket,
    ready: Boolean(supabaseUrl && serviceRoleKey && bucket),
  };
}

function sanitizeFileName(fileName = "") {
  const normalized = String(fileName || "dokument").trim();
  const withoutPath = normalized.replace(/[/\\]/g, "_");
  const safe = withoutPath
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return safe || "dokument";
}

function sanitizePathSegment(value = "") {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "") || "entry";
}

function formatMonthSegment(date = new Date()) {
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
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

function getExtensionFromFileName(fileName = "") {
  const safeName = sanitizeFileName(fileName);
  const dotIndex = safeName.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === safeName.length - 1) {
    return "";
  }
  const extension = safeName.slice(dotIndex + 1).toLowerCase();
  return extension ? `.${extension}` : "";
}

function buildIncomingObjectPath(invoiceId = "", originalFileName = "") {
  const now = Date.now();
  const invoiceSegment = sanitizePathSegment(invoiceId || "invoice");
  const extension = getExtensionFromFileName(originalFileName);
  const fileBase = sanitizeFileName(originalFileName).replace(/\.[^.]+$/, "") || "beleg";
  const monthSegment = formatMonthSegment(new Date());
  return `incoming-invoices/${monthSegment}/${invoiceSegment}/${now}_${fileBase}${extension}`;
}

async function ensureStorageBucket(supabaseUrl, serviceRoleKey, bucket) {
  const response = await fetch(`${supabaseUrl}/storage/v1/bucket/${encodeURIComponent(bucket)}`, {
    method: "GET",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
    },
  });
  if (response.ok) return;
  const errorText = await response.text().catch(() => "");
  const bucketMissing = response.status === 404 || (response.status === 400 && /bucket.+not found/i.test(errorText));
  if (!bucketMissing) {
    throw new Error("Supabase Storage-Bucket konnte nicht geprüft werden.");
  }

  const createResponse = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      id: bucket,
      name: bucket,
      public: false,
      file_size_limit: MAX_UPLOAD_BYTES,
    }),
  });
  if (createResponse.ok || createResponse.status === 409) return;
  throw new Error("Supabase Storage-Bucket konnte nicht angelegt werden.");
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

async function readAuthorizedProfile(userId, supabaseUrl, serviceRoleKey) {
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
  if (!profile || status !== "active" || !isPrivilegedRole(role)) {
    return { ok: false, status: 403, error: "Dokument-Upload ist nur für aktive Admins freigegeben." };
  }
  return { ok: true, profile };
}

async function readRequestFormData(req) {
  const request = new Request("http://localhost/upload", {
    method: "POST",
    headers: req.headers,
    body: req,
    duplex: "half",
  });
  return request.formData();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendMethodNotAllowed(res);
    return;
  }

  const { supabaseUrl, serviceRoleKey, bucket, ready } = getSupabaseConfig();
  if (!ready) {
    res.status(503).json({ error: "Supabase Dokumentablage ist nicht vollständig konfiguriert." });
    return;
  }

  try {
    const authResult = await authenticateUserWithSupabase(req.headers.authorization, supabaseUrl, serviceRoleKey);
    if (!authResult.ok) {
      res.status(authResult.status).json({ error: authResult.error });
      return;
    }
    const profileResult = await readAuthorizedProfile(authResult.userId, supabaseUrl, serviceRoleKey);
    if (!profileResult.ok) {
      res.status(profileResult.status).json({ error: profileResult.error });
      return;
    }
    await ensureStorageBucket(supabaseUrl, serviceRoleKey, bucket);

    const formData = await readRequestFormData(req);
    const fileValue = formData.get("file");
    const invoiceId = String(formData.get("invoiceId") || req.query?.invoiceId || "").trim();
    const file = fileValue && typeof fileValue === "object" && "arrayBuffer" in fileValue ? fileValue : null;

    if (!file) {
      res.status(400).json({ error: "Keine Datei übergeben." });
      return;
    }

    const fileName = sanitizeFileName(file.name || "beleg");
    const fileType = String(file.type || "application/octet-stream").trim() || "application/octet-stream";
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    if (!fileBuffer.length) {
      res.status(400).json({ error: "Leere Datei ist nicht erlaubt." });
      return;
    }
    if (fileBuffer.length > MAX_UPLOAD_BYTES) {
      res.status(413).json({ error: `Datei ist zu gross. Maximal ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.` });
      return;
    }

    const objectPath = buildIncomingObjectPath(invoiceId, fileName);
    const uploadResponse = await fetch(
      `${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/")}`,
      {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          authorization: `Bearer ${serviceRoleKey}`,
          "x-upsert": "true",
          "content-type": fileType,
        },
        body: fileBuffer,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      res.status(uploadResponse.status).json({
        error: errorText || "Upload in Supabase fehlgeschlagen.",
      });
      return;
    }

    res.status(200).json({
      ok: true,
      storage_mode: "supabase",
      bucket,
      document_path: objectPath,
      nas_path: objectPath,
      original_name: fileName,
      mime_type: fileType,
      size_bytes: fileBuffer.length,
    });
  } catch (error) {
    console.error("Supabase Upload Fehler", error);
    res.status(502).json({ error: "Dokument-Upload derzeit nicht erreichbar." });
  }
}
