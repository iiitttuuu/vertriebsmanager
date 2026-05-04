export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

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
  return { ok: true };
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
