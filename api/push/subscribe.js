function sanitizeSupabaseUrl(value = "") {
  const normalized = String(value || "").trim().replace(/\/+$/, "");
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(normalized) ? normalized : "";
}

function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.trim()) return JSON.parse(req.body);
  return {};
}

function isUuid(value = "") {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || "").trim());
}

function isValidSubscription(value) {
  const endpoint = String(value?.endpoint || "").trim();
  const p256dh = String(value?.keys?.p256dh || "").trim();
  const auth = String(value?.keys?.auth || "").trim();
  try {
    return new URL(endpoint).protocol === "https:" && endpoint.length <= 2048 && p256dh.length >= 20 && auth.length >= 8;
  } catch (_error) { return false; }
}

function isValidEndpoint(value) {
  const endpoint = String(value || "").trim();
  try {
    return new URL(endpoint).protocol === "https:" && endpoint.length <= 2048;
  } catch (_error) { return false; }
}

function isMissingPushSubscriptionTable(response, detail = "") {
  return Number(response?.status || 0) === 404 && /web_push_subscriptions|PGRST205|schema cache/i.test(String(detail || ""));
}

function normalizeAccountSubscriptions(value) {
  const seen = new Set();
  return (Array.isArray(value) ? value : []).map((entry) => {
    const subscription = entry?.subscription && typeof entry.subscription === "object" ? entry.subscription : entry;
    const endpoint = String(subscription?.endpoint || entry?.endpoint || "").trim();
    if (!isValidSubscription(subscription) || seen.has(endpoint)) return null;
    seen.add(endpoint);
    return { endpoint, subscription, updatedAt: String(entry?.updatedAt || "").trim() };
  }).filter(Boolean).slice(0, 4);
}

function accountPushSubscriptions(user) {
  return normalizeAccountSubscriptions(user?.user_metadata?.mwc_web_push_subscriptions || user?.app_metadata?.mwc_web_push_subscriptions);
}

async function getAuthUser(supabaseUrl, serviceRoleKey, userId) {
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` },
  });
  const user = await response.json().catch(() => null);
  if (!response.ok || !user?.id) throw new Error("Push-Anmeldung konnte nicht dem Benutzerkonto zugeordnet werden.");
  return user;
}

async function storeSubscriptionInAccount(supabaseUrl, serviceRoleKey, userId, subscription) {
  const user = await getAuthUser(supabaseUrl, serviceRoleKey, userId);
  const metadata = user.user_metadata && typeof user.user_metadata === "object" ? user.user_metadata : {};
  const endpoint = String(subscription.endpoint || "").trim();
  const subscriptions = [
    { endpoint, subscription, updatedAt: new Date().toISOString() },
    ...accountPushSubscriptions(user).filter((entry) => entry.endpoint !== endpoint),
  ].slice(0, 4);
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}`, "content-type": "application/json" },
    body: JSON.stringify({ user_metadata: { ...metadata, mwc_web_push_subscriptions: subscriptions } }),
  });
  if (!response.ok) throw new Error("Push-Anmeldung konnte nicht gespeichert werden.");
  const confirmedUser = await getAuthUser(supabaseUrl, serviceRoleKey, userId);
  if (!accountPushSubscriptions(confirmedUser).some((entry) => entry.endpoint === endpoint)) {
    throw new Error("Push-Anmeldung konnte nicht bestätigt werden.");
  }
}

async function removeSubscriptionFromAccount(supabaseUrl, serviceRoleKey, userId, endpoint) {
  const user = await getAuthUser(supabaseUrl, serviceRoleKey, userId);
  const metadata = user.user_metadata && typeof user.user_metadata === "object" ? user.user_metadata : {};
  const subscriptions = accountPushSubscriptions(user).filter((entry) => entry.endpoint !== endpoint);
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}`, "content-type": "application/json" },
    body: JSON.stringify({ user_metadata: { ...metadata, mwc_web_push_subscriptions: subscriptions } }),
  });
  if (!response.ok) throw new Error("Push-Anmeldung konnte nicht entfernt werden.");
}

async function authenticateActiveUser(req, supabaseUrl, serviceRoleKey) {
  const authorization = String(req.headers.authorization || "").trim();
  if (!authorization.toLowerCase().startsWith("bearer ")) return { ok: false, status: 401, error: "Nicht authentifiziert." };
  const token = authorization.slice(7).trim();
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: serviceRoleKey, authorization: `Bearer ${token}` } });
  const user = await userResponse.json().catch(() => null);
  const userId = String(user?.id || "").trim();
  if (!userResponse.ok || !isUuid(userId)) return { ok: false, status: 401, error: "Login-Token ist abgelaufen oder ungültig." };
  const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?select=status&user_id=eq.${encodeURIComponent(userId)}&limit=1`, {
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` },
  });
  const profiles = await profileResponse.json().catch(() => []);
  if (String(profiles?.[0]?.status || "").trim().toLowerCase() !== "active") return { ok: false, status: 403, error: "Konto ist nicht aktiv." };
  return { ok: true, userId };
}

export default async function handler(req, res) {
  if (!["POST", "DELETE"].includes(req.method)) {
    res.status(405).json({ error: "Methode nicht erlaubt." });
    return;
  }
  const supabaseUrl = sanitizeSupabaseUrl(req.headers["x-supabase-url"] || process.env.SUPABASE_URL || "");
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!supabaseUrl || !serviceRoleKey || !String(process.env.WEB_PUSH_VAPID_PUBLIC_KEY || "").trim()) {
    res.status(503).json({ error: "Push-Mitteilungen sind noch nicht eingerichtet." });
    return;
  }
  try {
    const authorization = await authenticateActiveUser(req, supabaseUrl, serviceRoleKey);
    if (!authorization.ok) {
      res.status(authorization.status).json({ error: authorization.error });
      return;
    }
    const body = parseBody(req);
    if (req.method === "DELETE") {
      const endpoint = String(body.endpoint || "").trim();
      if (!isValidEndpoint(endpoint)) {
        res.status(400).json({ error: "Ungültige Push-Anmeldung." });
        return;
      }
      const response = await fetch(`${supabaseUrl}/rest/v1/web_push_subscriptions?user_id=eq.${encodeURIComponent(authorization.userId)}&endpoint=eq.${encodeURIComponent(endpoint)}`, {
        method: "DELETE",
        headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` },
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        if (isMissingPushSubscriptionTable(response, detail)) await removeSubscriptionFromAccount(supabaseUrl, serviceRoleKey, authorization.userId, endpoint);
        else throw new Error("Push-Anmeldung konnte nicht entfernt werden.");
      }
      res.status(200).json({ ok: true });
      return;
    }
    if (!isValidSubscription(body.subscription)) {
      res.status(400).json({ error: "Ungültige Push-Anmeldung." });
      return;
    }
    const endpoint = String(body.subscription.endpoint).trim();
    const response = await fetch(`${supabaseUrl}/rest/v1/web_push_subscriptions?on_conflict=endpoint`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({ user_id: authorization.userId, endpoint, subscription: body.subscription, updated_at: new Date().toISOString() }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      if (isMissingPushSubscriptionTable(response, detail)) {
        await storeSubscriptionInAccount(supabaseUrl, serviceRoleKey, authorization.userId, body.subscription);
      } else {
        throw new Error("Push-Anmeldung konnte nicht gespeichert werden.");
      }
    }
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Push subscription failed", error);
    res.status(500).json({ error: "Push-Mitteilungen konnten nicht aktiviert werden." });
  }
}
