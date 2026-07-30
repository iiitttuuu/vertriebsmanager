# Projekt-Hinweis fuer neue Chats

Dieses Projekt hat zwei Varianten:

- Desktop-/Web-Variante: `index.html`, `app.js`, `styles.css`
- Vertriebs-App/PWA: `vertrieb.html`, `vertrieb-pwa.js`, `vertrieb-pwa.css`, `vertrieb-sw.js`, `vertrieb-manifest.webmanifest`

Bei jeder Aenderung muss immer beruecksichtigt werden, dass keine Variante die andere kaputt macht.

- App-spezifische Aenderungen duerfen die Desktop-Variante nicht beeinflussen.
- Desktop-spezifische Aenderungen duerfen die App/PWA nicht beeinflussen.
- Gemeinsame Daten, APIs, Supabase-Tabellen und gemeinsam genutzte Hilfsfunktionen koennen beide Varianten betreffen und muessen entsprechend vorsichtig geprueft werden.
- Vor Abschluss einer Aufgabe kurz festhalten, welche Variante geaendert wurde und ob die andere Variante mitgeprueft wurde.

## Release-Sperre

- Niemals `vercel --prod` direkt ausführen.
- Ausschließlich `./scripts/deploy-to-live.sh` verwenden.
- Das Skript bricht bei einem nicht sauberen Arbeitsordner, einem anderen Branch als `main` oder einem nicht zu `origin/main` passenden Stand ab.
- Nicht versionierte, uncommittete oder nur lokal vorhandene Änderungen dürfen nie versehentlich live gehen. Vor einem Release müssen sie bewusst geprüft, committed und nach `origin/main` gepusht werden.
