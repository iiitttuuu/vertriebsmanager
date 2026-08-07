import { QueueClient } from "@vercel/queue";
import { processProviderCrawlerQueueJob } from "./provider-crawler.js";

const queue = new QueueClient();

// Diese Funktion hat keinen öffentlichen HTTP-Zugang. Vercel Queues ruft sie nach
// dem erfolgreichen Speichern eines Crawl-Jobs sofort und mit Zustellgarantie auf.
export default queue.handleNodeCallback(async (message, metadata) => {
  const result = await processProviderCrawlerQueueJob(message, metadata);
  // Medien sind absichtlich nachrangig: Solange Text-Jobs warten, wird die Nachricht
  // mit dem konfigurierten Backoff erneut zugestellt.
  if (result?.deferred) throw new Error("Text-Crawls haben Vorrang vor der Medien-Stufe.");
});
