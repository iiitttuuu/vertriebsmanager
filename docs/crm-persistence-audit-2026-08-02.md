# CRM-Persistenz-Audit – 02.08.2026

## Befund

- Der kritische Anbieter-Speicherweg bestätigte bislang nur die Rückgabe der Anbieter-ID. Ein durch RLS gefilterter Write, eine Trigger-Anpassung oder ein unvollständiger Payload konnte damit als Erfolg erscheinen.
- Kritische Anbieteraktionen konnten den `app_state`-Abgleich in den Hintergrund verschieben. Zusammengehörende Einstellungen (z. B. Benachrichtigungen und Zuordnungen) waren beim Erfolgshinweis noch nicht bestätigt.
- `app_state`-Writes prüften die Auth-Sitzung nicht zentral und lasen den gespeicherten Zustand nicht erneut ein.
- Gesprächsnotizen und -aufgaben werden in drei Tabellen gespeichert. Mehrere Aktionen ignorierten einen Fehler dieses Synchronisationsbündels und meldeten dennoch Erfolg.
- Anbieter-Notizen konnten im lokalen Fallback eine Erfolgsmeldung anzeigen, obwohl sie nicht zentral gespeichert waren.
- Die Vertriebs-PWA übernahm nach dem Upsert einen lokalen Payload statt des erneut geladenen Serverstands.
- Das Feld „Im Dashboard angelegt“ war in der flachen Anbieter-Row nicht bei jedem Upsert enthalten; dadurch konnten API-/PWA-Ansichten einen veralteten Spaltenwert sehen.

## Änderungen

| Datei | Änderung |
| --- | --- |
| `app.js` | Kanonischer Payload-Fingerabdruck, vollständiger Read-after-write für selektive Anbieter-Saves, Löschbestätigung, frische Sitzung und Read-after-write für `app_state`. |
| `app.js` | Kein `deferAppState` mehr bei kritischen Anbieteraktionen; keine optimistische „gespeichert“-Meldung aus Hintergrund-Saves. |
| `app.js` | Gespräche, Notizen und Aufgaben werden nach dem gesamten Sync-Bündel erneut geladen und verglichen; Erfolgsmeldungen werten das Ergebnis aus. |
| `app.js` | Anbieter-Notizen prüfen Update/Insert/Delete-Antworten; lokale Fallbacks sind als Warnung gekennzeichnet. |
| `vertrieb-pwa.js` | Anbieter-Upsert fordert vollständige Daten an, lädt anschließend erneut und vergleicht den Server-Payload. |
| `supabase/patch_provider_workflow_permissions.sql`, `supabase/patch_providers_table.sql` | Aktive Benutzer erhalten explizit eine `SELECT`-Policy auf `providers`; der Dashboard-Status wird auch in die flache Tabellen-Spalte migriert und geschrieben. |
| `scripts/test-persistence-verification.mjs` | Regressionstest für die verpflichtenden Verifikations-, Session- und RLS-Schutzmechanismen. |

## Rollen und Bereiche

Statisch geprüft wurden die RLS-Pfade für `admin`, `superadmin`/`supaadmin`, `mitarbeiter` und `vertriebsmitarbeiter` (UI-Bezeichnung: Vertrieb). Im Fokus standen:

- Anbieter: Neu, Bearbeiten, Status/Claim, Zuordnung, Einladung, Löschen
- Anbieter-Notizen und Aufgabenstatus
- Gesprächsnotizen, Aufgaben, Status- und Zuständigkeitsänderungen
- `app_state`-abhängige Bereiche wie Kurse/Themen, Einstellungen und Zuordnungen
- Vertriebs-PWA: Anbieter speichern und Statuswechsel

## Testergebnis

- Syntaxprüfung für Desktop-CRM und Vertriebs-PWA
- Bestehende Tests für Provision, Anbieter-Workflow, Einladungs-API und Resilienz
- Neuer Persistenz-Regressionstest

Die Tests prüfen Codepfade und simulierte Fehlerfälle. Ein Live-RLS-Matrix-Test mit echten, getrennten Supabase-Testkonten ist nicht in diesem Repository automatisierbar und muss vor dem Rollout im Zielprojekt ausgeführt werden.

## Voraussetzung für Supabase

Vor dem Rollout `supabase/patch_provider_workflow_permissions.sql` erneut im Supabase SQL Editor ausführen. Der Patch ist idempotent und ergänzt die benötigte aktive `SELECT`-Policy für die Read-after-write-Prüfung.

## Verbleibende Risiken

- Gespräche bestehen technisch aus drei Tabellen. Die Anwendung erkennt und meldet jede Teilpersistenz nun zuverlässig, aber eine Netzwerkunterbrechung zwischen zwei Tabellen-Statements kann bereits geschriebene Teiländerungen auf dem Server hinterlassen. Die fachlich endgültige Absicherung wäre eine serverseitige RPC-Transaktion für das gesamte Gesprächsbündel.
- `app_state` ist weiterhin ein gemeinsamer JSONB-Snapshot. Read-after-write erkennt Abweichungen, ersetzt aber keine feldgenaue serverseitige Merge-/Versionslogik für gleichzeitig bearbeitete, unabhängige Bereiche.
- Lokale Fallbackdaten bleiben absichtlich sichtbar, werden aber nicht mehr als zentral gespeichert bezeichnet. Sie müssen nach Wiederherstellung der Verbindung bewusst erneut synchronisiert werden.
