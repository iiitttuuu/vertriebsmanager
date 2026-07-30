export default function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Methode nicht erlaubt." });
    return;
  }
  const publicKey = String(process.env.WEB_PUSH_VAPID_PUBLIC_KEY || "").trim();
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!publicKey || !serviceRoleKey) {
    res.status(503).json({ error: "Push-Mitteilungen sind noch nicht eingerichtet." });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ publicKey });
}
