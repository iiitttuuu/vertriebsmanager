# Übergabe: Anbieter-Crawler

Stand: 7. August 2026 · Branch `main` · Arbeitsordner war nach dem Release sauber.

## Letzte Live-Version

- Commit: `1c20169 Process provider crawler jobs in background`
- Produktivdeployment: `dpl_7aawVpi4LfoSD1UtQdNDvsXLPabB`
- Live-Adresse: `https://project-xykur.vercel.app`

Der Nutzer meldete zuletzt: „Crawler-Anfrage hat zu lange gedauert.“ Das ist
behoben und live: Beim Klick auf **Crawlen** wird der Lauf nur eingereiht. Die
Oberfläche wartet nicht mehr auf die vollständige Website-Analyse und kann
daher nicht mehr nach 60 Sekunden abbrechen. Der Vercel-Cron-Worker verarbeitet
den Auftrag im Hintergrund; nach etwa einer Minute aktualisiert der Nutzer die
Ansicht.

## Wichtige Dateien

- `api/provider-crawler.js`: geschützte Crawler-API, Queue-Verarbeitung,
  Website-Abruf, KI-Texte und private Bildspeicherung.
- `api/provider-crawler-worker.js`: Cron-Endpunkt; verarbeitet genau einen
  Queue-Eintrag.
- `vercel.json`: Cron `"/api/provider-crawler-worker"` jede Minute.
- `app.js`: Desktop-Oberfläche, Queue-Auftrag und Ergebnisdialog.
- `index.html`, `styles.css`: Desktop-Crawlerbereich und großer Ergebnisdialog.
- `docs/provider-crawler.md`: fachliche und technische Betriebsdokumentation.
- `scripts/test-provider-crawler-api.mjs`: API-Sicherheitstests.

## Verhalten und Datenintegrität

- Niemals in `providers` schreiben: alle Crawlerdaten liegen getrennt in den
  Staging-Tabellen `provider_crawl_runs`, `provider_crawl_results`,
  `provider_crawl_experiences`, `provider_crawl_media` und
  `provider_crawl_events`.
- Jeder erneute Crawl erzeugt einen neuen Lauf; bestehende Ergebnisse werden
  nicht überschrieben.
- Anbieter, bei denen `dashboard_created = true` ist, werden beim Einreihen und
  nochmals unmittelbar vor dem Website-Abruf ausgeschlossen.
- Zugriff ist ausschließlich für aktive Admins/Superadmins mit AAL2/TOTP.
- Bilder und Logos liegen im privaten Bucket `provider-crawler`. Der
  Ergebnisdialog erhält nur kurz gültige, serverseitig erzeugte Signed URLs.
  Alte Läufe von vor Commit `38b8239` können weiterhin keine externen CDN-Bilder
  enthalten; hierfür einen neuen Crawl starten.

## Zuletzt vorgenommene Optimierungen

- Der Browser ruft nach `enqueue` nicht mehr `process_next` synchron auf.
- Pro Crawl maximal 24 nach Relevanz priorisierte HTML-Seiten.
- Maximal sieben gespeicherte Medien insgesamt, davon höchstens zwei je Erlebnis.
- Anbieterprofil und jedes einzelne Erlebnis erhalten getrennte Quellenkontexte
  für die KI-Texte.
- Der Button **Ergebnis** öffnet einen großen, strukturierten Desktop-Dialog mit
  Profil, Angeboten, Logo und Bildern.

## Noch sinnvoll zu prüfen

1. Als AAL2-Admin einen frischen Crawl ausführen, etwa eine Minute warten und
   **Aktualisieren** klicken. Es muss kein Browser-Timeout mehr erscheinen.
2. Prüfen, ob der Cron auf Produktion tatsächlich einen wartenden Eintrag
   übernimmt. `CRON_SECRET` ist in Produktion gesetzt.
3. Für die Textqualität anhand konkreter Anbieterseiten bewerten. Bei Bedarf
   nur die Prompt-/Quellenauswahl in `api/provider-crawler.js` nachschärfen;
   niemals Ergebnisse automatisch in den Anbieter-Datensatz übernehmen.

## Prüfungen vor dem letzten Release

Folgende Befehle liefen erfolgreich:

```sh
npm test
node --check api/provider-crawler.js
node --check app.js
git diff --check
npx vercel build
```

`npx vercel build` verändert in diesem Repository versehentlich versionierte
`node_modules`-Dateien. Danach ausschließlich diese Build-Artefakte mit
`git restore --worktree -- node_modules` zurücksetzen, bevor der Status geprüft
wird.

## Unbedingt vor weiteren Änderungen lesen

- `AGENTS.md`
- `docs/rollen-rechte-sicherheit.md` vollständig, sobald Rollen, Navigation,
  Datenzugriff, API oder Supabase betroffen sind.
- Bei jeder Supabase-Arbeit die Skill-Anleitung `supabase:supabase` vollständig
  lesen und den aktuellen Supabase-Changelog abrufen.

Keine Secrets dokumentieren oder nach bereits hinterlegten Schlüsseln fragen.
Für Releases niemals `vercel --prod` verwenden, sondern ausschließlich
`./scripts/deploy-to-live.sh`. Die PWA-Dateien (`vertrieb.*`) wurden beim
Crawler nicht verändert und müssen bei weiteren Arbeiten weiterhin getrennt
geprüft werden.
