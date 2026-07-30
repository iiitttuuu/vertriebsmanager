import webpush from "web-push";

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
    return { endpoint, subscription };
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
  return response.ok && user?.id ? user : null;
}

async function getAccountSubscriptions(supabaseUrl, serviceRoleKey, recipientUserIds) {
  const entries = [];
  for (let index = 0; index < recipientUserIds.length; index += 12) {
    const users = await Promise.all(recipientUserIds.slice(index, index + 12).map((userId) => getAuthUser(supabaseUrl, serviceRoleKey, userId)));
    users.forEach((user) => {
      if (!user) return;
      accountPushSubscriptions(user).forEach((entry) => {
        entries.push({ id: entry.endpoint, user_id: user.id, subscription: entry.subscription, storage: "account" });
      });
    });
  }
  return entries;
}

async function authenticateSuperadmin(req, supabaseUrl, serviceRoleKey) {
  const authorization = String(req.headers.authorization || "").trim();
  if (!authorization.toLowerCase().startsWith("bearer ")) return { ok: false, status: 401, error: "Nicht authentifiziert." };
  const token = authorization.slice(7).trim();
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: serviceRoleKey, authorization: `Bearer ${token}` } });
  const user = await userResponse.json().catch(() => null);
  const userId = String(user?.id || "").trim();
  if (!userResponse.ok || !isUuid(userId)) return { ok: false, status: 401, error: "Login-Token ist abgelaufen oder ungültig." };
  const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?select=role,status&user_id=eq.${encodeURIComponent(userId)}&limit=1`, {
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` },
  });
  const profiles = await profileResponse.json().catch(() => []);
  const profile = profiles?.[0] || {};
  const role = String(profile.role || "").trim().toLowerCase();
  if (String(profile.status || "").trim().toLowerCase() !== "active" || !["superadmin", "supaadmin"].includes(role)) {
    return { ok: false, status: 403, error: "Nur Superadmins dürfen Push-Mitteilungen senden." };
  }
  return { ok: true };
}

async function getSubscriptions(supabaseUrl, serviceRoleKey, recipientUserIds) {
  const response = await fetch(`${supabaseUrl}/rest/v1/web_push_subscriptions?select=id,user_id,subscription`, {
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (isMissingPushSubscriptionTable(response, detail)) return getAccountSubscriptions(supabaseUrl, serviceRoleKey, recipientUserIds);
    throw new Error("Push-Abonnements konnten nicht geladen werden.");
  }
  const recipientSet = new Set(recipientUserIds);
  return (await response.json().catch(() => [])).filter((entry) => recipientSet.has(String(entry?.user_id || "").trim())).map((entry) => ({ ...entry, storage: "table" }));
}

async function deleteExpiredTableSubscription(supabaseUrl, serviceRoleKey, id) {
  if (!id) return;
  await fetch(`${supabaseUrl}/rest/v1/web_push_subscriptions?id=eq.${encodeURIComponent(String(id))}`, {
    method: "DELETE",
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` },
  }).catch(() => {});
}

async function deleteExpiredAccountSubscription(supabaseUrl, serviceRoleKey, userId, endpoint) {
  const user = await getAuthUser(supabaseUrl, serviceRoleKey, userId);
  if (!user) return;
  const metadata = user.user_metadata && typeof user.user_metadata === "object" ? user.user_metadata : {};
  const remaining = accountPushSubscriptions(user).filter((entry) => entry.endpoint !== endpoint);
  await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}`, "content-type": "application/json" },
    body: JSON.stringify({ user_metadata: { ...metadata, mwc_web_push_subscriptions: remaining } }),
  }).catch(() => {});
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Methode nicht erlaubt." });
    return;
  }
  const supabaseUrl = sanitizeSupabaseUrl(req.headers["x-supabase-url"] || process.env.SUPABASE_URL || "");
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const publicKey = String(process.env.WEB_PUSH_VAPID_PUBLIC_KEY || "").trim();
  const privateKey = String(process.env.WEB_PUSH_VAPID_PRIVATE_KEY || "").trim();
  if (!supabaseUrl || !serviceRoleKey || !publicKey || !privateKey) {
    res.status(200).json({ configured: false, delivered: 0 });
    return;
  }
  try {
    const authorization = await authenticateSuperadmin(req, supabaseUrl, serviceRoleKey);
    if (!authorization.ok) {
      res.status(authorization.status).json({ error: authorization.error });
      return;
    }
    const body = parseBody(req);
    const recipientUserIds = Array.from(new Set((Array.isArray(body.recipientUserIds) ? body.recipientUserIds : []).map((entry) => String(entry || "").trim()).filter(isUuid))).slice(0, 500);
    const messageBody = String(body.body || "").trim().slice(0, 800);
    const senderName = String(body.senderName || "Superadmin").trim().slice(0, 180) || "Superadmin";
    const messageId = String(body.messageId || "employee-message").trim().slice(0, 180);
    if (!recipientUserIds.length || !messageBody) {
      res.status(400).json({ error: "Empfänger und Nachricht sind erforderlich." });
      return;
    }
    webpush.setVapidDetails(String(process.env.WEB_PUSH_VAPID_SUBJECT || "mailto:office@my-waycard.com").trim(), publicKey, privateKey);
    const subscriptions = await getSubscriptions(supabaseUrl, serviceRoleKey, recipientUserIds);
    let delivered = 0;
    await Promise.all(subscriptions.map(async (entry) => {
      try {
        await webpush.sendNotification(entry.subscription, JSON.stringify({
          title: `Nachricht von ${senderName}`,
          body: messageBody,
          tag: `employee_message_${messageId}`,
          unreadCount: 1,
        }), { TTL: 60 * 60 * 24, urgency: "high" });
        delivered += 1;
      } catch (error) {
        const statusCode = Number(error?.statusCode || 0);
        if (statusCode === 404 || statusCode === 410) {
          if (entry.storage === "account") await deleteExpiredAccountSubscription(supabaseUrl, serviceRoleKey, entry.user_id, entry.subscription?.endpoint);
          else await deleteExpiredTableSubscription(supabaseUrl, serviceRoleKey, entry.id);
        }
        else console.warn("Web push delivery failed", statusCode || error?.message || "unknown");
      }
    }));
    console.info("Employee message push completed", { recipients: recipientUserIds.length, subscriptions: subscriptions.length, delivered });
    res.status(200).json({ configured: true, delivered });
  } catch (error) {
    console.error("Employee message push failed", error);
    res.status(500).json({ error: "Push-Mitteilung konnte nicht zugestellt werden." });
  }
}
