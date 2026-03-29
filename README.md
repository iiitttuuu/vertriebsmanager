# Vertriebsmanager Plattform

Web-App (MVP) fuer Admin- und Mitarbeiter-Rollen:

- Mitarbeiter anlegen, bearbeiten, loeschen
- Anbieter anlegen, bearbeiten
- Verwaltung mit Kategorien, Unterkategorien, Themen
- Themenzuordnung pro Anbieter
- Google Places Adressvorschlaege

## Architektur

- Frontend: statische Dateien (`index.html`, `app.js`, `styles.css`)
- Backend/DB: Supabase (Tabelle `app_state` mit JSONB-Zustand)
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
3. In `config.js` setzen:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
4. Seite neu laden. Danach liest/schreibt die App in Supabase.

## Google Places Setup

1. In `config.js` `GOOGLE_MAPS_API_KEY` eintragen.
2. In Google Cloud aktivieren:
   - `Maps JavaScript API`
   - `Places API`
3. API-Key per Referrer einschraenken (Vercel-Domain + localhost).

## Vercel Deployment

1. Projekt nach GitHub pushen.
2. In Vercel importieren.
3. Nach Deploy `config.js` mit deinen Werten ausliefern (oder vorab im Repo setzen).
4. Bei Google Referrer die Vercel-Domain freigeben, z. B.:
   - `https://dein-projekt.vercel.app/*`

## Wichtige Sicherheitshinweise

- Google API-Key niemals als unrestricted Key nutzen.
- Supabase `anon` Key ist fuer Browser gedacht, aber Policies muessen streng sein.
- In `supabase/schema.sql` sind aktuell offene MVP-Policies fuer `anon`/`authenticated`.
  Fuer Produktion solltest du spaeter auf `authenticated` + echte Benutzer-Authentifizierung umstellen.
