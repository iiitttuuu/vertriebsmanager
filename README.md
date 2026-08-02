# MyWayControl Plattform

Web-App (MVP) fuer Admin- und Mitarbeiter-Rollen:

- Mitarbeiter anlegen, bearbeiten, loeschen
- Anbieter anlegen, bearbeiten
- Verwaltung mit Kategorien, Unterkategorien, Themen
- Themenzuordnung pro Anbieter
- Google Places Adressvorschlaege

## Wichtiger Entwicklungsgrundsatz

Dieses Projekt hat zwei Varianten: die normale Desktop-/Web-Variante und die Vertriebs-App/PWA. Bei jeder Aenderung muss immer geprueft werden, ob beide Varianten betroffen sind.

- App-spezifische Aenderungen duerfen die Desktop-Variante nicht kaputt machen.
- Desktop-spezifische Aenderungen duerfen die App/PWA nicht kaputt machen.
- Gemeinsame Dateien wie `app.js`, `styles.css`, `index.html`, `vertrieb.html`, `vertrieb-pwa.js` und `vertrieb-pwa.css` muessen besonders vorsichtig bearbeitet werden.
- Vor Abschluss einer Aufgabe kurz festhalten, welche Variante geaendert wurde und ob die andere Variante mitgeprueft wurde.

## Architektur

- Frontend: statische Dateien (`index.html`, `app.js`, `styles.css`)
- Backend/DB: Supabase (Tabelle `app_state` mit JSONB-Zustand)
- Dokumentablage: Plattform-API (`/api/incoming-invoices/files/*`) als Bridge zur internen Dateiablage
- Deployment: Vercel

Wenn Supabase nicht konfiguriert ist, laeuft die App weiter mit lokalem Fallback (`localStorage`).

## Lokaler Start

```bash
python3 -m http.server 8080
```

Dann `http://localhost:8080/index.html` oeffnen.

## Supabase Setup

1. In Supabase ein neues Projekt erstellen.
2. SQL aus `supabase/schema.sql` im SQL Editor ausfuehren.
3. SQL aus `supabase/auth_and_rls.sql` im SQL Editor ausfuehren.
4. SQL aus `supabase/patch_providers_table.sql` im SQL Editor ausfuehren.
5. SQL aus `supabase/patch_provider_workflow_permissions.sql` im SQL Editor ausfuehren. Dieser Patch sichert den In-Bearbeitung-Claim und den Einladungs-Workflow serverseitig ab.
6. Fuer Gesprächsnotizen (Superadmin-Tool): SQL aus `supabase/patch_conversation_notes.sql` ausfuehren.
7. Für Push-Mitteilungen der Vertriebs-PWA: SQL aus `supabase/patch_web_push_subscriptions.sql` ausführen.
8. Für sofortige Desktop-Synchronisierung ohne häufiges Polling: SQL aus `supabase/patch_desktop_realtime_sync.sql` ausführen.
9. Optional: SQL aus `supabase/seed_categories.sql` ausfuehren, um die 6 Standard-Hauptkategorien vorzubelegen.
10. In `config.js` setzen:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - Die folgenden Werte gehören **nicht** in `config.js`: Im Vercel-Projekt unter *Settings → Environment Variables* `SUPABASE_SERVICE_ROLE_KEY` (und empfehlenswert auch `SUPABASE_URL`) setzen. Der Service-Role-Key wird nur von den geschützten Server-Endpunkten für Einladungen verwendet und darf nie an den Browser ausgeliefert werden.
9. Seite neu laden. Danach liest/schreibt die App in Supabase.

## Login / Mitarbeiter-Flow

- Login ist jetzt per E-Mail + Passwort aktiv.
- Admin legt Mitarbeiter als Einladung an.
- Mitarbeiter erstellt danach selbst ein Konto mit derselben E-Mail + Passwort.
- Beim ersten erfolgreichen Signup wird automatisch ein Profil erstellt und Einladung auf `accepted` gesetzt.
- In Supabase unter `Authentication -> Providers -> Email` muss E-Mail Login aktiviert sein.
- In Supabase unter `Authentication -> Providers -> Email` fuer diesen Flow am besten `Confirm email` deaktivieren.
- Für **„Passwort vergessen?“** unter `Authentication -> URL Configuration -> Redirect URLs` diese Adresse freigeben: `https://project-xykur.vercel.app/?auth=recovery`. Ohne diesen einmaligen Supabase-Eintrag darf der sichere Rücksetzlink nicht zur Anwendung zurückkehren. Für Tests auf weiteren Domains muss jeweils dieselbe URL mit `?auth=recovery` ergänzt werden.
- Für produktiven Mailversand empfiehlt sich in Supabase ein eigener SMTP-Anbieter; der Standardversand ist vor allem für Entwicklung und Tests gedacht.

## Push-Mitteilungen für die Vertriebs-App

Direkte Nachrichten an die Glocke erscheinen in der mobilen Vertriebs-App. Für eine Push-Mitteilung bei geschlossener App wird einmalig Folgendes eingerichtet:

1. Optimal: `supabase/patch_web_push_subscriptions.sql` im Supabase SQL Editor ausführen. Ist die Tabelle noch nicht vorhanden, nutzt die App automatisch einen geschützten Server-Fallback im Auth-Konto des jeweiligen Mitarbeiters; es ist kein Push-Datensatz für andere App-Nutzer sichtbar.
2. Ein VAPID-Schlüsselpaar erzeugen, z. B. lokal mit `npx web-push generate-vapid-keys`.
3. In Vercel nur als geschützte Environment Variables setzen:
   - `WEB_PUSH_VAPID_PUBLIC_KEY`
   - `WEB_PUSH_VAPID_PRIVATE_KEY`
   - optional `WEB_PUSH_VAPID_SUBJECT` (z. B. `mailto:office@my-waycard.com`)
4. Die Vertriebs-App am Handy zum Home-Bildschirm installieren und unter der Glocke „Push am Handy aktivieren“ antippen.

Auf iPhone und iPad funktioniert Web Push für zum Home-Bildschirm hinzugefügte Web-Apps. Die Entscheidung bleibt jederzeit in den System-Benachrichtigungseinstellungen des Geräts steuerbar.

Hinweis:
- Der erste Benutzer, der sich anmeldet, wird automatisch `admin`.
- Weitere Benutzer sind standardmaessig `mitarbeiter`, ausser sie haben eine Admin-Einladung.

## Hilfe & Start

`Hilfe & Start` ist ein eigener Bereich und wird nicht im Vertriebs-Dashboard angezeigt.

- Beim ersten Einstieg einer Person startet ein Onboarding-Dialog mit dem konfigurierten Startvideo, weiteren Onboarding-Videos sowie allen fuer Rolle und Plattform-Land verpflichtenden Themen. Admin und Superadmin sehen diesen Dialog nicht.
- Bei mehreren Videos zeigt das Onboarding den Player links und die nummerierte Videoauswahl rechts. Videos werden sofort geladen; direkt gehostete und eingebettete Videos werden nach vollstaendiger Wiedergabe als erledigt erfasst. Es gibt keine manuellen "gesehen"-Buttons.
- Admin und Superadmin pflegen auf derselben Seite das primaere Startvideo, weitere Onboarding-Videos, Datenschutz- und Support-Link sowie alle Hilfe-Themen mit einem einfachen Rich-Text-Editor.
- Themen lassen sich als Entwurf, aktiv oder archiviert fuehren, rollen- und laenderbasiert ausspielen und mit einer neuen Pflichtversion erneut ausliefern.
- Direkte HTTPS-MP4- oder WebM-Dateien laufen im nativen Player; YouTube- und Vimeo-Links werden direkt im Onboarding eingebettet. Vimeo-Freigabe- und Review-Links werden beim Speichern in die passende private Player-URL aufgeloest.
- Der Fortschritt speichert ausschliesslich die benoetigte Information `Inhalt-ID + Version angesehen` je Benutzer-ID; keine Abspieldauer oder Detailanalyse.

## Google Places Setup

1. In `config.js` `GOOGLE_MAPS_API_KEY` eintragen.
2. In Google Cloud aktivieren:
   - `Maps JavaScript API`
   - `Places API`
3. API-Key per Referrer einschraenken (Vercel-Domain + localhost).

## Vercel Deployment

Live-Ziel ist immer:

- `https://project-xykur.vercel.app/`

Deployment:

```bash
./scripts/deploy-to-live.sh
```

Das Skript deployed per Vercel Production Deploy und setzt anschliessend den Alias auf `project-xykur.vercel.app`.

Bei Google Referrer diese Vercel-Domain freigeben:

- `https://project-xykur.vercel.app/*`

## Dokumentablage-Bridge (transparent fuer User)

Damit Upload/Download in der UI wie eine native Plattform-Funktion wirkt, werden Dateien ueber interne API-Routen geleitet:

- `POST /api/incoming-invoices/files/upload`
- `GET /api/incoming-invoices/files/download`

Noetige Vercel ENV Variablen:

- `FILE_BRIDGE_BASE_URL` (URL deines internen File-Services, der auf NAS schreibt/liest)
- `FILE_BRIDGE_SHARED_KEY` (optional, Shared Secret zwischen Vercel-API und File-Service)

Der eigentliche NAS-Zugriff passiert damit nur serverseitig ueber den File-Service, nie direkt im Browser.

## Wichtige Sicherheitshinweise

- Google API-Key niemals als unrestricted Key nutzen.
- Supabase `anon` Key ist fuer Browser gedacht, aber RLS muss aktiv sein.
- Mit `supabase/auth_and_rls.sql` ist RLS fuer `profiles`, `employee_invites` und `app_state` enthalten.

## Wichtig: Desktop-CRM und Vertriebs-App strikt trennen

Dieses Projekt hat **zwei getrennte Oberflächen**. Bei künftigen Änderungen darf nicht angenommen werden, dass eine Änderung in der einen Oberfläche automatisch auch in der anderen erfolgen soll.

| Oberfläche | URL | Zuständige Dateien |
| --- | --- | --- |
| Desktop-CRM | `/` | `index.html`, `app.js`, `styles.css` |
| Mobile Vertriebs-App (PWA) | `/vertrieb` | `vertrieb.html`, `vertrieb-pwa.js`, `vertrieb-pwa.css`, `vertrieb-sw.js`, `vertrieb-manifest.webmanifest` |

Arbeitsregel:

- Sagt der Auftrag **„in der App“**, nur die PWA-Dateien ändern – niemals nebenbei `app.js`, `styles.css` oder `index.html` anpassen.
- Sagt der Auftrag **„Desktop“** oder **„CRM“**, nur die Desktop-Dateien ändern.
- Eine Änderung in beiden Oberflächen ist nur dann erlaubt, wenn sie ausdrücklich für beide angefordert wurde.
- Gemeinsame Daten liegen in Supabase (`providers`, `profiles`, `app_state`); eine Daten-/API-Änderung kann beide Oberflächen betreffen und muss deshalb besonders geprüft werden.

### Aktueller Funktionsstand der Vertriebs-App

- Einstieg: `/vertrieb`; beim Starten oder Zurückkehren in die App wird immer die Ansicht **Start** gezeigt.
- Kopf: kleines my-waycard-CRM-Logo links oben.
- Fußnavigation: ausschließlich **Start** und **Neu**. Anbieter, Hilfe, offene Vorgänge und Abdeckung werden über die Startseite geöffnet.
- Startseite: farbige, untereinanderliegende Buttons für `Anbieter bearbeiten`, `Neuen Anbieter anlegen`, `Meine offenen Vorgänge`, `Abdeckung`, `Hilfe & Anleitung`; Hilfe ist der letzte Button. Zuletzt bearbeitete Anbieter erscheinen erst nach dem Scrollen.
- Anbieterstatus in der PWA: `Offen`, `In Bearbeitung`, `Live-Beantragung`, `LIVE`. Rücksetzen zwischen den nicht-finalen Stufen ist erlaubt; LIVE bleibt final und wird im Desktop-CRM korrigiert.
- Anbieter-Detailansicht: dunkelblauer Kopf, direkter Schalter **„Im Dashboard angelegt“** (Admin/Vertriebsmitarbeiter, kein Mitbewerb) und Einladungsaktion. Die Einladung ist nur bei `In Bearbeitung` für den zuständigen Bearbeiter bzw. Admin möglich.
- Themen im Schritt 4/4: Suche filtert live nach Thema, Themenbereich und Kategorie; ausgeblendete Treffer müssen wirklich per `[hidden]` unsichtbar sein.
- Abdeckung: mobile eigene Ansicht mit Bundesland-Auswahl und Kategorie-Balkendiagrammen. Mitarbeiter sehen nur eigene Anbieter; **Superadmins sehen alle aktiven Nicht-Mitbewerb-Anbieter**. Die Balken zeigen je Kategorie den Anteil `im Dashboard angelegt`.
- Layout: Die PWA nutzt die komplette verfügbare Bildschirmbreite; keine zentrierte Desktop-Spalte in der App erzwingen.

### PWA-Änderungen veröffentlichen

Bei jeder Änderung an `vertrieb-pwa.js` oder `vertrieb-pwa.css` muss der PWA-Cache aktualisiert werden:

1. In `vertrieb.html` die Versionsparameter von CSS und JavaScript erhöhen.
2. In `vertrieb-sw.js` denselben Versionsstand im `CACHE_NAME` und im `APP_SHELL` eintragen.
3. Syntax prüfen:

```bash
node --check vertrieb-pwa.js
node --check vertrieb-sw.js
```

4. Erst nach ausdrücklicher Freigabe für eine Veröffentlichung deployen:

```bash
./scripts/deploy-to-live.sh
```

Danach lädt eine installierte PWA die neue Version üblicherweise nach dem Schließen und erneuten Öffnen.
