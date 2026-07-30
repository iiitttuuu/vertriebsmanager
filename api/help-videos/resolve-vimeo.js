const VIMEO_SHARE_PATH = /^\/share\/([0-9a-f-]{20,80})\/?$/i;
const VIMEO_REVIEW_PATH = /^\/reviews\/[0-9a-f-]{20,80}\/videos\/(\d+)\/?$/i;
const VIMEO_PLAYER_URL = /https:\/\/player\.vimeo\.com\/video\/(\d+)(?:\?[^"'\\\s<>]*)?/gi;
const VIMEO_HASH = /^[a-f0-9]{6,64}$/i;

function sendMethodNotAllowed(res) {
  res.status(405).json({ error: "Method not allowed" });
}

function createVimeoPlayerUrl(id, hash = "") {
  const normalizedId = String(id || "").trim();
  const normalizedHash = String(hash || "").trim();
  if (!/^\d{2,20}$/.test(normalizedId) || (normalizedHash && !VIMEO_HASH.test(normalizedHash))) {
    return "";
  }
  return `https://player.vimeo.com/video/${normalizedId}${normalizedHash ? `?h=${normalizedHash}` : ""}`;
}

function normalizeVimeoPlayerUrl(value = "") {
  try {
    const url = new URL(String(value || "").trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const id = String(url.pathname.match(/^\/video\/(\d+)$/)?.[1] || "");
    return host === "player.vimeo.com" ? createVimeoPlayerUrl(id, url.searchParams.get("h") || "") : "";
  } catch (_error) {
    return "";
  }
}

function sanitizeVimeoResolvableUrl(value = "") {
  try {
    const url = new URL(String(value || "").trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (url.protocol !== "https:" || host !== "vimeo.com") {
      return null;
    }
    if (VIMEO_SHARE_PATH.test(url.pathname)) {
      return { url: url.href, fallbackEmbedUrl: "" };
    }
    const reviewMatch = url.pathname.match(VIMEO_REVIEW_PATH);
    if (reviewMatch) {
      return { url: url.href, fallbackEmbedUrl: createVimeoPlayerUrl(reviewMatch[1]) };
    }
    return null;
  } catch (_error) {
    return null;
  }
}

function extractVimeoPlayerUrl(html = "") {
  const source = String(html || "").replace(/\\u0026/g, "&").replace(/&amp;/g, "&").replace(/\\\//g, "/");
  for (const match of source.matchAll(VIMEO_PLAYER_URL)) {
    const embedUrl = normalizeVimeoPlayerUrl(match[0]);
    if (embedUrl) {
      return embedUrl;
    }
  }
  return "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendMethodNotAllowed(res);
    return;
  }

  const target = sanitizeVimeoResolvableUrl(req.body?.url);
  if (!target) {
    res.status(400).json({ error: "Bitte einen gültigen Vimeo-Freigabe- oder Review-Link verwenden." });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(target.url, {
      method: "GET",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "MyWayControl Vimeo resolver",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) {
      if (target.fallbackEmbedUrl) {
        res.setHeader("cache-control", "no-store");
        res.status(200).json({ embedUrl: target.fallbackEmbedUrl });
        return;
      }
      res.status(502).json({ error: "Der Vimeo-Link konnte nicht geladen werden." });
      return;
    }
    const embedUrl = extractVimeoPlayerUrl(await response.text()) || target.fallbackEmbedUrl;
    if (!embedUrl) {
      res.status(422).json({ error: "Der Vimeo-Link enthält kein abspielbares Video." });
      return;
    }
    res.setHeader("cache-control", "no-store");
    res.status(200).json({ embedUrl });
  } catch (error) {
    if (target.fallbackEmbedUrl) {
      res.setHeader("cache-control", "no-store");
      res.status(200).json({ embedUrl: target.fallbackEmbedUrl });
      return;
    }
    const message = error?.name === "AbortError" ? "Die Vimeo-Auflösung hat zu lange gedauert." : "Vimeo ist derzeit nicht erreichbar.";
    res.status(502).json({ error: message });
  } finally {
    clearTimeout(timeout);
  }
}
