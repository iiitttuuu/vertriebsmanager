// Der Browser wechselt nach 3,2 Sekunden auf diesen Fallback. Ein passender,
// begrenzter Server-Timeout verhindert, dass beide Wege den Login lange blockieren.
const AUTH_PROXY_TIMEOUT_MS = 14000;
const MAX_EMAIL_LENGTH = 320;
const MAX_PASSWORD_LENGTH = 1024;

function sanitizeSupabaseUrl(value = "") {
  const normalized = String(value || "").trim().replace(/\/+$/, "");
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(normalized) ? normalized : "";
}

function parseJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  if (typeof req.body === "string" && req.body.trim()) {
    return JSON.parse(req.body);
  }
  return {};
}

function getErrorPayload(payload, fallbackMessage) {
  const message = payload?.msg || payload?.message || payload?.error_description || payload?.error || fallbackMessage;
  return {
    error: String(message || fallbackMessage),
    code: String(payload?.code || payload?.error_code || ""),
  };
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = parseJsonBody(req);
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const supabaseUrl = sanitizeSupabaseUrl(req.headers["x-supabase-url"] || "");
    const anonKey = String(req.headers["x-supabase-anon-key"] || "").trim();
    if (!supabaseUrl || !anonKey) {
      res.status(503).json({ error: "Anmelde-Service ist nicht vollständig konfiguriert." });
      return;
    }
    if (!email || email.length > MAX_EMAIL_LENGTH || !email.includes("@") || password.length < 8 || password.length > MAX_PASSWORD_LENGTH) {
      res.status(400).json({ error: "Ungültige Anmeldedaten." });
      return;
    }

    const response = await fetchWithTimeout(
      `${supabaseUrl}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          apikey: anonKey,
          authorization: `Bearer ${anonKey}`,
          "content-type": "application/json",
          "x-client-info": "vertriebsmanager-auth-proxy",
        },
        body: JSON.stringify({ email, password }),
      },
      AUTH_PROXY_TIMEOUT_MS
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      res.status(response.status).json(getErrorPayload(payload, `Anmeldung fehlgeschlagen (HTTP ${response.status}).`));
      return;
    }
    res.status(200).json(payload || {});
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    res.status(timedOut ? 504 : 502).json({
      error: timedOut
        ? "Supabase Auth antwortet aktuell nicht rechtzeitig. Bitte erneut versuchen."
        : "Anmelde-Service ist aktuell nicht erreichbar. Bitte erneut versuchen.",
    });
  }
}
