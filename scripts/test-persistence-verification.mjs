import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const pwaSource = readFileSync(new URL("../vertrieb-pwa.js", import.meta.url), "utf8");
const workflowSql = readFileSync(
  new URL("../supabase/patch_provider_workflow_permissions.sql", import.meta.url),
  "utf8"
);

assert.match(
  appSource,
  /function getStablePersistenceFingerprint\(value\)/,
  "Desktop-CRM benötigt einen kanonischen Fingerabdruck für Persistenzprüfungen."
);
assert.match(
  appSource,
  /\.upsert\(chunk, \{ onConflict: "id" \}\)\.select\("\*"\)/,
  "Selektive Anbieter-Saves müssen die vollständige Serverantwort anfordern."
);
assert.match(
  appSource,
  /\.select\("\*"\)\s*\.in\("id", expectedIds\)/,
  "Anbieter-Saves müssen anschließend einen separaten Reload durchführen."
);
assert.match(
  appSource,
  /Anbieter-Speicherung ist nach dem erneuten Laden unvollständig/,
  "Unvollständige Anbieter-Payloads müssen sichtbar fehlschlagen."
);
assert.match(
  appSource,
  /\.delete\(\)\.in\("id", chunk\)\.select\("id"\)/,
  "Anbieter-Löschungen müssen durch zurückgegebene IDs bestätigt werden."
);
assert.match(
  appSource,
  /const sessionCheck = await ensureFreshSupabaseSessionForWrite\(\);/,
  "Jeder app_state-Write muss eine frische Sitzung prüfen."
);
assert.match(
  appSource,
  /App-Status weicht nach dem erneuten Laden vom gespeicherten Stand ab/,
  "App-State-Write benötigt eine Read-after-write-Prüfung."
);
assert.doesNotMatch(
  appSource,
  /deferAppState:\s*true/,
  "Kritische Anbieter-Änderungen dürfen nicht vor dem vollständigen app_state-Sync Erfolg melden."
);
assert.match(
  appSource,
  /const conversationSaved = await syncConversationThreadRemoteOrWarn/,
  "Gesprächsaktionen müssen das Ergebnis der Remote-Synchronisierung auswerten."
);
assert.match(
  appSource,
  /Gespräch, Notizen oder Aufgaben weichen nach dem erneuten Laden/,
  "Gesprächsbundles benötigen eine vollständige Reload-Prüfung."
);

assert.match(
  pwaSource,
  /\.upsert\(row, \{ onConflict: "id" \}\)\s*\.select\("\*"\)/,
  "Die Vertriebs-PWA muss die vollständige Serverantwort anfordern."
);
assert.match(
  pwaSource,
  /Anbieter ist nach dem Speichern nicht erneut ladbar/,
  "Die Vertriebs-PWA muss einen erneuten Read verlangen."
);
assert.match(
  pwaSource,
  /Anbieter wurde nicht vollständig gespeichert/,
  "Die Vertriebs-PWA darf bei Payload-Abweichung keinen Erfolg melden."
);

assert.match(
  workflowSql,
  /create policy "providers_auth_select"[\s\S]*p\.status = 'active'/,
  "RLS muss aktiven Rollen den Read für die Write-Verifikation erlauben."
);
assert.match(
  workflowSql,
  /'vertriebsmitarbeiter'/,
  "Die Workflow-RLS muss die Vertriebsrolle einschließen."
);

console.log("Persistenz-Verifikation geprüft: Anbieter, app_state, Gespräche und PWA verlangen Serverbestätigung.");
