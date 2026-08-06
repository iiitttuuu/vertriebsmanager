# Projekt-Hinweis fuer neue Chats

Dieses Projekt hat zwei Varianten:

- Desktop-/Web-Variante: `index.html`, `app.js`, `styles.css`
- Vertriebs-App/PWA: `vertrieb.html`, `vertrieb-pwa.js`, `vertrieb-pwa.css`, `vertrieb-sw.js`, `vertrieb-manifest.webmanifest`

Bei jeder Aenderung muss immer beruecksichtigt werden, dass keine Variante die andere kaputt macht.

- App-spezifische Aenderungen duerfen die Desktop-Variante nicht beeinflussen.
- Desktop-spezifische Aenderungen duerfen die App/PWA nicht beeinflussen.
- Gemeinsame Daten, APIs, Supabase-Tabellen und gemeinsam genutzte Hilfsfunktionen koennen beide Varianten betreffen und muessen entsprechend vorsichtig geprueft werden.
- Vor Abschluss einer Aufgabe kurz festhalten, welche Variante geaendert wurde und ob die andere Variante mitgeprueft wurde.

## Sicherheitskritisch: Rollen, Rechte und Superadmin-MFA

Vor jeder Aenderung an Rollen, Navigation, Datenzugriff, APIs oder Supabase-RLS muss
`docs/rollen-rechte-sicherheit.md` vollstaendig gelesen und befolgt werden.

- **Default deny:** Eine neue Seite, API, Tabelle oder Aktion ist fuer eine Rolle erst
  nach expliziter serverseitiger Freigabe zugreifbar.
- **UI ist keine Sicherheitsgrenze.** Navigation oder ausgeblendete Elemente duerfen
  nie die einzige Zugriffskontrolle sein. Datenzugriff muss in Supabase RLS und/oder
  der API mit dem authentifizierten Benutzer durchgesetzt werden.
- Rechteaenderungen laufen ausschliesslich ueber
  `public.set_role_permission_override(...)`, nie per direktem Client-Write. Der
  Audit-Log ist Pflicht.
- Admin- und Superadmin-Aktionen, insbesondere Rechteaenderungen, erfordern eine
  AAL2-/TOTP-Session. Keinen MFA-Bypass, kein lokales Flag und keine Abschwaechung
  ohne explizite Sicherheitsfreigabe einbauen.
- Eine Seitenfreigabe erweitert **nicht** automatisch Lese-/Schreibrechte auf Daten.
  Dafuer ist ein separater, getesteter RLS-/API-Patch mit getrennten Testkonten Pflicht.
- Vor einem Release sind mindestens Codepruefung, automatisierte Tests und ein
  Rollen-Matrix-Test mit getrennten Testkonten durchzufuehren und zu dokumentieren.

## Release-Sperre

- Niemals `vercel --prod` direkt ausführen.
- Ausschließlich `./scripts/deploy-to-live.sh` verwenden.
- Das Skript bricht bei einem nicht sauberen Arbeitsordner, einem anderen Branch als `main` oder einem nicht zu `origin/main` passenden Stand ab.
- Nicht versionierte, uncommittete oder nur lokal vorhandene Änderungen dürfen nie versehentlich live gehen. Vor einem Release müssen sie bewusst geprüft, committed und nach `origin/main` gepusht werden.
