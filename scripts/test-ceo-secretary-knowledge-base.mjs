import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const appSource = read("app.js");
const pageSource = read("index.html");
const apiSource = read("api/ceo-secretary/process.js");
const sqlSource = read("supabase/patch_ceo_secretary_knowledge_base.sql");
const workspaceSqlSource = read("supabase/patch_ceo_secretary_knowledge_workspace.sql");

assert.match(appSource, /CEO_SECRETARY_ENTRY_TYPES = Object\.freeze\(\["note", "task", "followup", "decision", "idea", "knowledge"\]\)/, "Der Sekretär kennt Ideen und Wissen als Eintragstypen.");
assert.match(appSource, /function sanitizeCeoSecretaryTags/, "Schlagwörter werden vor dem Speichern begrenzt und normalisiert.");
assert.match(appSource, /if \(tags\.includes\(term\)\) return total \+ 3/, "Die Suche berücksichtigt Schlagwörter.");
assert.match(pageSource, /data-ceo-secretary-memory-filter="idea"[^>]*>Ideen/, "Ideen sind als schlanker Filter im Gedächtnis erreichbar.");
assert.match(pageSource, /data-ceo-secretary-memory-filter="knowledge"[^>]*>Wissen/, "Wissen ist als schlanker Filter im Gedächtnis erreichbar.");
assert.match(apiSource, /"idea", "knowledge"/, "Die serverseitige KI-Auswertung akzeptiert die neuen Eintragstypen.");
assert.match(apiSource, /tags: \{ type: "array", items: \{ type: "string" \} \}/, "Die KI-Auswertung liefert nur strukturierte Schlagwörter.");
assert.match(sqlSource, /add column if not exists tags text\[\] not null default '\{\}'/, "Der Datenbankpatch ergänzt Schlagwörter.");
assert.match(sqlSource, /check \(entry_type in \('note', 'task', 'followup', 'decision', 'idea', 'knowledge'\)\)/, "Der Datenbankpatch erlaubt ausschließlich bekannte Eintragstypen.");
assert.match(appSource, /function renderCeoSecretaryIdeaBoard/, "Das Ideenboard wird als eigener Arbeitsbereich gerendert.");
assert.match(pageSource, /id="ceo-secretary-idea-board-panel"/, "Das Ideenboard wird nur bei Bedarf innerhalb des Gedächtnisses geöffnet.");
assert.match(workspaceSqlSource, /workspace_status text/, "Der Board-Status wird privat in der CEO-Tabelle gespeichert.");
assert.match(workspaceSqlSource, /workspace_status', entry_row\.workspace_status/, "Der Board-Status wird im CEO-Audit erfasst.");

console.log("Sekretär-Wissensbasis geprüft: Ideen, Wissen, Schlagwörter und der Datenbankpatch sind konsistent.");
