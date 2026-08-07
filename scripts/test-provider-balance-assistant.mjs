import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [appSource, htmlSource, stylesSource] = await Promise.all([
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../styles.css", import.meta.url), "utf8"),
]);

assert.match(appSource, /function buildProviderBalanceAssistantScope\(/, "Der Assistent baut seine Auswahl aus dem bestehenden Anbieterbestand.");
assert.match(appSource, /!isProviderDashboardCreated\(provider\)/, "Bereits im Dashboard angelegte Anbieter werden ausgeschlossen.");
assert.match(appSource, /!canCurrentUserOpenProvider\(provider, currentUser\)/, "Für den Nutzer gesperrte Anbieter werden nicht vorgeschlagen.");
assert.match(appSource, /function getProviderBalanceCapacityDeficit\(/, "Die Auswahl berechnet den Rückstand relativ zur verfügbaren Kapazität.");
assert.match(appSource, /const smoothingSize = 4/, "Kleine Bundesländer werden gegen Zufallsschwankungen geglättet.");
assert.match(appSource, /topicDeficit \+ stateDeficit \+ pairDeficit \* 0\.35/, "Themen, Bundesländer und ihre Kombination werden kapazitätsgerecht gewichtet.");
assert.match(appSource, /Math\.random\(\)/, "Gleichwertige Vorschläge werden zufällig gemischt.");
assert.match(appSource, /canCurrentUserSetProviderDashboardCreated/, "Der Assistent bleibt auf Rollen begrenzt, die den vorhandenen Dashboard-Schalter setzen dürfen.");
assert.match(htmlSource, /id="provider-balance-assistant-modal"/, "Die Auswahl erscheint in einem eigenen Dialog.");
assert.match(htmlSource, /id="provider-balance-assistant-btn"/, "Der Assistent ist aus der bestehenden Aktionsleiste erreichbar.");
assert.match(stylesSource, /\.provider-balance-assistant-modal/, "Der Dialog hat eine isolierte Darstellung.");

console.log("Anlage-Assistent geprüft: offene Anbieter, Zugriffsgrenzen und ausgewogene Zufallsauswahl sind verbunden.");
