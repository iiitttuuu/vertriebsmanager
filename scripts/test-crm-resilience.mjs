import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");

function extractFunction(name) {
  const asyncMarker = `async function ${name}(`;
  const marker = `function ${name}(`;
  const asyncStart = appSource.indexOf(asyncMarker);
  const start = asyncStart >= 0 ? asyncStart : appSource.indexOf(marker);
  assert.notEqual(start, -1, `Funktion ${name} wurde nicht gefunden.`);
  const parametersEnd = appSource.indexOf(")", start);
  const bodyStart = appSource.indexOf("{", parametersEnd);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = bodyStart; index < appSource.length; index += 1) {
    const char = appSource[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return appSource.slice(start, index + 1);
    }
  }
  throw new Error(`Funktion ${name} konnte nicht vollständig gelesen werden.`);
}

const context = {
  AbortController,
  Error,
  SUPABASE_REQUEST_TIMEOUT_MS: 15,
  window: {
    setTimeout,
    clearTimeout,
    fetch: null,
  },
};
vm.createContext(context);
vm.runInContext(extractFunction("createTimeoutError"), context);
vm.runInContext(extractFunction("fetchSupabaseWithTimeout"), context);

let aborted = false;
context.window.fetch = (_input, options) =>
  new Promise((_resolve, reject) => {
    options.signal.addEventListener(
      "abort",
      () => {
        aborted = true;
        reject(options.signal.reason);
      },
      { once: true }
    );
  });

await assert.rejects(
  () => context.fetchSupabaseWithTimeout("https://example.test/hanging"),
  (error) => error?.name === "TimeoutError"
);
assert.equal(aborted, true, "Hängende Supabase-Anfragen müssen aktiv abgebrochen werden.");

context.window.fetch = async (_input, options) => {
  assert.ok(options.signal instanceof AbortSignal, "Supabase-Fetch muss ein Abbruchsignal erhalten.");
  return { ok: true, status: 200 };
};
const response = await context.fetchSupabaseWithTimeout("https://example.test/fast");
assert.equal(response.status, 200, "Erfolgreiche Supabase-Anfragen müssen unverändert durchlaufen.");

assert.match(
  appSource,
  /global:\s*\{\s*fetch:\s*fetchSupabaseWithTimeout\s*,?\s*\}/,
  "Der Supabase-Client muss den Timeout-Fetch global verwenden."
);
assert.match(
  appSource,
  /async function syncProvidersTableWithStateNow[\s\S]*?fingerprint === lastProvidersTableFingerprint[\s\S]*?return \{ ok: true, reason: "unchanged" \};[\s\S]*?const sessionCheck = await ensureFreshSupabaseSessionForWrite\(\);/,
  "Unveränderte Anbieter dürfen normale CRM-Saves nicht durch eine zusätzliche Session-Prüfung verlangsamen."
);
assert.match(
  appSource,
  /function scheduleRemoteStateRetry\(\)[\s\S]*?REMOTE_RETRY_INITIAL_DELAY_MS[\s\S]*?queueRemoteStateSave\(\);/,
  "Kurzzeitige app_state-Ausfälle müssen automatisch mit dem aktuellen Stand erneut versucht werden."
);
assert.match(
  appSource,
  /async function insertTopicSubtopicWithRetry[\s\S]*?attempt <= 3[\s\S]*?findTopicSubtopicOnServer[\s\S]*?await waitForMs\(300 \* attempt\)/,
  "Sub-Themen müssen bei kurzfristigen Supabase-Aussetzern verifiziert wiederholt werden."
);

// Ein interaktiver Anbieter-Save darf nicht hinter mehreren langsamen
// Hintergrund-Synchronisierungen warten. Nach dem bereits laufenden Request
// muss er vor den wartenden Hintergrundjobs ausgeführt werden.
let releaseActiveSync;
const activeSyncGate = new Promise((resolve) => {
  releaseActiveSync = resolve;
});
const syncOrder = [];
const schedulerContext = {
  Promise,
  pendingCriticalProvidersTableSyncs: [],
  pendingBackgroundProvidersTableSyncs: [],
  providersTableSyncRunning: false,
  syncProvidersTableWithStateNow: async (providers) => {
    syncOrder.push(providers.id);
    if (providers.id === "active") {
      await activeSyncGate;
    }
    return { ok: true, id: providers.id };
  },
};
vm.createContext(schedulerContext);
vm.runInContext(extractFunction("syncProvidersTableWithState"), schedulerContext);
vm.runInContext(extractFunction("processNextProvidersTableSync"), schedulerContext);

const activeSync = schedulerContext.syncProvidersTableWithState({ id: "active" });
const backgroundSync = schedulerContext.syncProvidersTableWithState({ id: "background" });
const criticalSync = schedulerContext.syncProvidersTableWithState({ id: "critical" }, { priority: "critical" });
releaseActiveSync();
await Promise.all([activeSync, backgroundSync, criticalSync]);
assert.deepEqual(
  syncOrder,
  ["active", "critical", "background"],
  "Interaktive Anbieter-Saves müssen vor wartenden Hintergrund-Synchronisierungen laufen."
);

console.log("CRM-Resilienz geprüft: Requests brechen sauber ab und Anbieter-Saves werden priorisiert.");
