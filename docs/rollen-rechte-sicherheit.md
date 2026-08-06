# Rollen, Rechte und Superadmin-MFA – verbindliche Sicherheitsvorgabe

Stand: 2026-08-06

Diese Vorgabe gilt fuer die Desktop-/Web-Variante und die Vertriebs-App/PWA. Sie ist
bei jeder Aenderung an UI-Seiten, Navigation, APIs, Supabase-Tabellen, RLS-Policies,
Authentifizierung oder Benutzerrollen zwingend zu beachten.

## Sicherheitsmodell

Die Anwendung verwendet vier kanonische Rollen:

- `mitarbeiter`
- `vertriebsmitarbeiter`
- `admin`
- `superadmin` (`supaadmin` wird nur als Legacy-Wert zu `superadmin` normalisiert)

Es gilt **default deny**: Ohne explizite serverseitig abgesicherte Regel darf eine
Rolle weder Daten lesen noch schreiben. Das Ausblenden eines Menuepunkts oder einer
Seite ist nur Bedienoberflaeche und nie eine Sicherheitskontrolle.

## Admin, Superadmin und MFA

Admins und Superadmins muessen eine TOTP-Authenticator-App mit QR-Code einrichten und
eine AAL2-Session besitzen. Die Datenbankfunktionen `public.is_admin()` und
`public.is_superadmin()` muessen Rolle und `public.superadmin_mfa_verified()` pruefen.
Der zugehoerige Patch ist `supabase/patch_superadmin_mfa.sql`; bei einer bereits
eingerichteten Datenbank ist anschliessend auch `supabase/patch_admin_mfa.sql`
auszufuehren.

Eine bestehende AAL2-Sitzung darf einen Browser-Refresh ueberstehen. Das ist
beabsichtigt; der Code wird bei neuer Anmeldung, abgelaufener Sitzung oder auf einem
neuen Geraet erneut verlangt. Kein lokales Storage-Flag, URL-Parameter oder
Client-seitiger Rollenwert darf MFA ersetzen.

## Rechte-Editor: aktueller Umfang

Der Superadmin-Editor unter **Organisation → Rollen & Rechte** verwaltet aktuell
**Seiten- und Navigationszugriffe**. Die Regeln liegen in:

- `public.permission_catalog`
- `public.role_permission_overrides`
- `public.role_permission_audit`

Die einzige Schreibschnittstelle fuer Rollenrechte ist die Security-Definer-Funktion
`public.set_role_permission_override(target_role, target_permission_key, next_effect)`.
Sie erfordert `public.is_superadmin()`, schreibt einen Audit-Eintrag und akzeptiert
nur Katalogberechtigungen mit `is_assignable = true`.

`public.register_page_permission_catalog(entries)` pflegt den Seitenkatalog aus den
tatsaechlich vorhandenen UI-Sektionen. Kritische Seiten wie Rollen & Rechte und Mein
Konto sind nicht zuweisbar. Der Patch
`supabase/patch_role_permissions_foundation.sql` setzt diese Grundlage voraus und
muss **nach** dem MFA-Patch im Supabase SQL Editor ausgefuehrt werden.

Eine explizit erlaubte Seite darf nicht durch eine alte UI-Klasse wie
`role-admin-only`, `admin-only` oder `superadmin-only` wieder verborgen werden. Die
Auswertung erfolgt zentral in `resolveAccessibleSectionForRole`,
`updateSidebarNavigationVisibilityForRole` und
`syncRolePagePanelVisibilityForRole`.

## Harte Grenze: Seitenrechte sind keine Datenrechte

Eine Seitenfreigabe darf niemals automatisch Datenrechte verleihen. Ein Benutzer kann
eine freigegebene Seite sehen, aber jeder Datenzugriff bleibt so lange verweigert, bis
die jeweilige Tabelle und API separat abgesichert und getestet wurden.

Fuer jede neue Datenberechtigung sind alle folgenden Punkte Pflicht:

1. Einen eindeutigen Berechtigungsschluessel und eine dokumentierte Aktion
   (`read`, `create`, `update` oder `delete`) definieren.
2. Supabase-RLS auf der Tabelle nach dem Least-Privilege-Prinzip ergaenzen.
3. Jede Vercel-API authentifiziert den Bearer-Token serverseitig und prueft Rolle,
   Kontostatus und gegebenenfalls AAL2. Kein Vertrauen in Header, Body oder
   Client-Rollenwerte.
4. Service-Role-Schluessel bleiben ausschliesslich serverseitig; Browser-Code darf sie
   nie erhalten.
5. Mit mindestens einem Konto je betroffener Rolle testen: erlaubte Aktion muss
   funktionieren; jede nicht erlaubte Lese- und Schreibaktion muss mit `403`/RLS-
   Verweigerung scheitern.
6. Testfall, Tabelle/API und SQL-Patch im Release dokumentieren.

## Aenderungs- und Release-Checkliste

Vor jedem Release mit Rollen-/Rechtebezug:

1. Beide Varianten pruefen: Desktop/Web und PWA.
2. Neue oder entfernte UI-Sektionen muessen im Rechtekatalog erscheinen und erhalten
   ohne Regel keine weitergehende Datenfreigabe.
3. Privilegierte Funktionen mit AAL2-Admin und AAL2-Superadmin testen; bei AAL1 muss
   jede privilegierte Aktion serverseitig scheitern.
4. Eine Freigabe und einen Entzug mit einem getrennten Testkonto der Zielrolle testen:
   Navigation und Seite muessen nach erneuter Sitzung/Seitenaktualisierung korrekt
   erscheinen bzw. verschwinden.
5. Einen direkten API-/Supabase-Aufruf als nicht berechtigte Rolle testen. Er muss
   scheitern, auch wenn jemand eine URL kennt oder DOM-Elemente sichtbar macht.
6. Audit-Eintrag in `role_permission_audit` pruefen.
7. `npm test`, Syntaxpruefung, `git diff --check` und einen gezielten manuellen
   Rollen-Matrix-Test ausfuehren.
8. Nur auf `main`, sauber und mit `./scripts/deploy-to-live.sh` releasen.

## Verbotene Abkuerzungen

- Keine Rolle nur durch CSS, Navigation, Local Storage oder einen Frontend-Check
  schuetzen.
- Keine direkten `insert`, `update` oder `delete` vom Browser auf Rechte-Tabellen.
- Keine pauschalen `authenticated`-Policies fuer vertrauliche Daten.
- Keine Aenderung an `is_superadmin`, `is_admin`, MFA oder RLS ohne getrennten
  Sicherheitsreview und Rollentests.
- Keine Behauptung, eine Seite sei vollstaendig sicher, solange der zugehoerige
  serverseitige Datenzugriff nicht mit getrennten Testrollen verifiziert wurde.
