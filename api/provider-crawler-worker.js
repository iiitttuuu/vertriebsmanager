import providerCrawlerHandler from "./provider-crawler.js";

// Vercel Cron ruft diesen schmalen, geheimnisgeschützten Worker auf. Er verarbeitet
// genau einen wartenden Lauf; damit bleibt die Parallelität kontrolliert.
export default async function handler(req, res) {
  return providerCrawlerHandler(
    {
      ...req,
      method: "POST",
      body: { action: "process_next" },
    },
    res
  );
}
