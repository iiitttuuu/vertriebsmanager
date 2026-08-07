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
4. Für den Cron-Fallback `CRON_SECRET` in Vercel setzen. Vercel übermittelt dieses
   Geheimnis an den Cron-Aufruf; optional kann statt dessen
   `PROVIDER_CRAWLER_CRON_SECRET` verwendet werden. Der primäre, sofortige Start
   erfolgt über Vercel Queues und benötigt kein zusätzliches Browser-Geheimnis.

## Sicherheits- und Betriebsregeln

- Nur aktive AAL2-Admins/Superadmins können den Bereich lesen, Crawls einreihen,
  Reviews speichern oder Ergebnisse freigeben.
- Der Worker prüft `dashboard_created = false` beim Einreihen und unmittelbar vor
  jedem Website-Abruf. Ein inzwischen angelegter Anbieter wird als
  `skipped_already_created` beendet.
- Der Crawler folgt nur der Anbieter-Domain, blockiert lokale/private IP-Ziele und
  prüft Redirects erneut. Login-, CAPTCHA- und private Bereiche werden nicht umgangen.
- Sichtbarer Seiteninhalt wird nicht mehr nach einem kurzen Kopfbereich abgeschnitten.
  Bei Next.js-Websites werden zusätzlich öffentlich eingebettete Inhaltsdaten genutzt,
  etwa um Storyblok-Kursdaten und Kontaktangaben auszulesen. Die Daten bleiben dabei
  weiterhin reine Quellen; Anweisungen aus der Website werden nie befolgt.
- Ein Crawl besteht aus zwei Stufen. Zuerst werden höchstens fünf nach Angebotsrelevanz
  priorisierte HTML-Seiten in kleinen parallelen Batches verarbeitet und die Textdaten
  sofort gespeichert. Logo und bis zu vier Bilder je maximal drei Erlebnissen folgen
  als nachgelagerte Medien-Stufe, sobald keine Text-Crawls mehr warten. Damit bleiben
  langsame Bilddownloads von den nutzbaren Ergebnissen entkoppelt. Nach dem
  Einreihen veröffentlicht der Server einen Vercel-Queue-Auftrag; dessen privater
  Worker startet sofort mit höchstens zwei parallelen Crawls. Bei temporären Fehlern
  wird derselbe Lauf bis zu zweimal erneut zugestellt. Der Cron verarbeitet weiterhin
  einen wartenden Eintrag je Aufruf als Sicherheitsnetz. Nach dem Einreihen kehrt die
  Oberfläche sofort zurück; der Crawl läuft ausschließlich im Hintergrund.
- Die Text-Stufe ist auf kurze Einzelabrufe begrenzt. Die KI-Redaktion hat ein
  eigenes Zeitlimit; falls sie nicht rechtzeitig antwortet, werden die bereits
  belegten Fakten und Angebotsauszüge trotzdem als `partial` gespeichert und sind
  sofort im Ergebnisdialog verfügbar. Ein durch einen Plattformabbruch länger als
  zwei Minuten auf `running` stehender Lauf wird vom nächsten Worker-Aufruf
  kontrolliert erneut eingereiht.
- Für Plattformtexte erhält die KI nur geprüfte Auszüge der gefundenen Anbieter- und
  Angebotsseiten. Anbieterprofil und jeder einzelne Kurs erhalten getrennte
  Quellenkontexte; Kursbeschreibungen dürfen nicht aus allgemeinen Anbietertexten
  ergänzt werden. Unternehmens- und Erlebnisadressen werden quellbelegt in Straße,
  Hausnummer, PLZ, Ort und Land aufgeteilt gespeichert; der Crawl übernimmt zudem
  Vor- und Nachnamen der Geschäftsführung, E-Mail, Telefon, Website, Slogan sowie
  je Erlebnis den direkten Link und bis zu vier Bilder. Explizit genannte Preise und
  Dauer stehen nur als zusätzliche, belegte Redaktionshilfe zur Verfügung.
  Die Texte bleiben Entwürfe zur fachlichen Prüfung; ältere Crawl-Läufe werden nie
  überschrieben. Ein erneuter Crawl erzeugt immer einen separaten redaktionellen
  Entwurf.
- Logo und Angebotsbilder bleiben im privaten Storage-Bucket. Die Desktop-Ansicht lädt
  sie nur über kurz gültige, serverseitig nach AAL2-Admin-Prüfung erzeugte Links; der
  Bucket wird dafür nicht öffentlich geschaltet.
- Freigeben bedeutet ausschließlich „Crawler-Revision fachlich geprüft“. Es löst
  keine Übernahme und keine Änderung des bestehenden Anbieters aus.
