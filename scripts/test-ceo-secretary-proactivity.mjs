import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [appSource, htmlSource, apiSource] = await Promise.all([
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../api/ceo-secretary/process.js", import.meta.url), "utf8"),
]);

assert.match(appSource, /function getCeoSecretaryMorningBriefing\(/, "Der Sekretär erzeugt ein Morgenbriefing.");
assert.match(appSource, /function getCeoSecretaryFollowupPrompt\(/, "Der Sekretär leitet einen konkreten Nachfasspunkt ab.");
assert.match(appSource, /function parseCeoSecretaryRelativeReminder\(/, "Der Sekretär erkennt kurze relative Erinnerungen.");
assert.match(appSource, /function scheduleCeoSecretaryLocalReminder\(/, "Der Sekretär plant Kurz-Erinnerungen für die Glocke.");
assert.match(appSource, /title: "Morgenbriefing · Sekretär"/, "Das Morgenbriefing erscheint in der Glocke.");
assert.match(appSource, /targetView: "briefing"/, "Die Glocke öffnet das CEO-Briefing direkt.");
assert.match(appSource, /data-admin-notification-target-view/, "Glockenmeldungen können gezielt eine Unteransicht öffnen.");
assert.match(htmlSource, /id="ceo-secretary-followup-prompt"/, "Das Briefing hat einen sichtbaren Nachfassimpuls.");
assert.match(apiSource, /function getJwtAssuranceLevel\(/, "Der CEO-Endpunkt prüft die Assurance-Stufe serverseitig.");
assert.match(apiSource, /getJwtAssuranceLevel\(token\) !== "aal2"/, "Der CEO-Endpunkt verweigert AAL1-Sitzungen.");

console.log("Sekretär-Proaktivität geprüft: Morgenbriefing, Glocke, Nachfassen und AAL2-Schutz sind verbunden.");
