# Anbieter-Crawler

Der Anbieter-Crawler ist ausschließlich in der Desktop-/Web-Variante verfügbar.
Die Vertriebs-PWA wird nicht verändert.

## Datentrennung

Der Crawler schreibt niemals in `public.providers` oder in bestehende Anbieter-/Plattformdaten.
Alle Ergebnisse liegen separat in `provider_crawl_runs`, `provider_crawl_results`,
`provider_crawl_experiences`, `provider_crawl_media` und `provider_crawl_events`.
Die Verbindung zum bestehenden Anbieter erfolgt nur über `provider_id`.

## Einrichtung vor dem Release

1. Die Migration `supabase/migrations/20260807151919_provider_crawler.sql` in der
   verbundenen Supabase-Umgebung anwenden und danach die RLS-/Rollenmatrix mit
   getrennten Testkonten prüfen.
2. In Vercel müssen serverseitig `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY`
   vorhanden sein. Der Service-Role-Schlüssel darf niemals in Browser-Code gelangen.
3. Für KI-Texte `OPENAI_API_KEY` setzen; optional kann
   `PROVIDER_CRAWLER_OPENAI_MODEL` festgelegt werden. Ohne Schlüssel speichert der
   Crawler nur belegte Fakten und markiert den Lauf als `partial`.
4. Für die Cron-Queue `CRON_SECRET` in Vercel setzen. Vercel übermittelt dieses
   Geheimnis an den Cron-Aufruf; optional kann statt dessen
   `PROVIDER_CRAWLER_CRON_SECRET` verwendet werden.

## Sicherheits- und Betriebsregeln

- Nur aktive AAL2-Admins/Superadmins können den Bereich lesen, Crawls einreihen,
  Reviews speichern oder Ergebnisse freigeben.
- Der Worker prüft `dashboard_created = false` beim Einreihen und unmittelbar vor
  jedem Website-Abruf. Ein inzwischen angelegter Anbieter wird als
  `skipped_already_created` beendet.
- Der Crawler folgt nur der Anbieter-Domain, blockiert lokale/private IP-Ziele und
  prüft Redirects erneut. Login-, CAPTCHA- und private Bereiche werden nicht umgangen.
- Pro Lauf gelten Grenzen für Seiten, Antwortgrößen, Redirects und Downloads. Ein
  Cron-Aufruf verarbeitet höchstens einen Queue-Eintrag.
- Für Plattformtexte erhält die KI nur geprüfte Auszüge der gefundenen Anbieter- und
  Angebotsseiten. Anbieterprofil und jeder einzelne Kurs erhalten getrennte
  Quellenkontexte; Kursbeschreibungen dürfen nicht aus allgemeinen Anbietertexten
  ergänzt werden. Die Texte bleiben Entwürfe zur fachlichen Prüfung; ältere Crawl-Läufe
  werden nie überschrieben. Ein erneuter Crawl erzeugt immer einen separaten Lauf mit
  einem neuen redaktionellen Entwurf.
- Freigeben bedeutet ausschließlich „Crawler-Revision fachlich geprüft“. Es löst
  keine Übernahme und keine Änderung des bestehenden Anbieters aus.
