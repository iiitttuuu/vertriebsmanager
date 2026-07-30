# Anbieter-API v1 – Read-only

Diese Schnittstelle stellt ausschließlich Anbieter aus dem Vertriebsbereich bereit. Sie verändert weder CRM-Daten noch das bestehende Frontend.

## Vor Freischaltung

1. Die aktuelle Datenbank sichern:

   ```bash
   ./scripts/backup_supabase_readonly.sh
   ```

   Das Skript sichert `app_state`, `provider_registry` und die vollständige Tabelle `providers`, erzeugt Prüfsummen und bricht bei einem unvollständigen Backup ab. Die Sicherung liegt unter `backups/supabase/<UTC-Zeitstempel>/` und wird nicht in Git eingecheckt.

2. In Vercel die bestehenden Server-Variablen prüfen:

   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

3. Einen eigenen, zufälligen Integrationstoken ausschließlich in Vercel hinterlegen:

   ```bash
   openssl rand -hex 32
   ```

   Den Wert als `PROVIDERS_READ_API_TOKEN` setzen. Er gehört nie in `config.js`, den Browser oder Git.

Ohne diesen Token antwortet die Route mit `503` und ist damit nicht versehentlich öffentlich freigeschaltet.

## Endpunkt

`GET /api/v1/providers`

Authentifizierung:

```http
Authorization: Bearer <PROVIDERS_READ_API_TOKEN>
```

Optionale Query-Parameter:

| Parameter | Beispiel | Beschreibung |
| --- | --- | --- |
| `id` | `provider_abc123` | Einzelnen Anbieter laden |
| `q` | `muster` | Namenssuche |
| `status` | `live` | Exakter Anbieterstatus |
| `country` | `Österreich` | Exaktes Land |
| `updated_since` | `2026-07-27T00:00:00Z` | Nur seit diesem Zeitpunkt geänderte Datensätze |
| `page` | `2` | Seite, ab 1 |
| `page_size` | `50` | Seitengröße, maximal 100 |

Beispiel:

```bash
curl -sS 'https://project-xykur.vercel.app/api/v1/providers?status=live&page_size=25' \
  -H 'Authorization: Bearer <TOKEN>'
```

Beispielantwort:

```json
{
  "api_version": "v1",
  "items": [
    {
      "id": "provider_123",
      "name": "Muster GmbH",
      "status": "live",
      "website": "https://muster.at",
      "email": "office@muster.at",
      "phone": "+431234567",
      "contact": {
        "first_name": "Anna",
        "last_name": "Muster",
        "email": "anna@muster.at",
        "phone": "+431234568"
      },
      "locations": [
        {
          "address": "Musterstraße 1",
          "postal_code": "1010",
          "city": "Wien",
          "state": "Wien",
          "country": "Österreich",
          "latitude": 48.2082,
          "longitude": 16.3738
        }
      ],
      "coverage": { "mode": "locations", "country": "", "states": [] },
      "topic_ids": ["fitness"],
      "online_only": false,
      "responsible": { "user_id": "…", "name": "…", "role": "vertriebsmitarbeiter" },
      "created_at": "2026-07-01T10:00:00.000Z",
      "updated_at": "2026-07-27T10:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "page_size": 25, "total": 1, "has_more": false }
}
```

## Sicherheits- und Datenregeln

- Die Route akzeptiert nur `GET`; sie enthält keinen Schreibpfad.
- Ausschließlich die relationale Tabelle `providers` ist Quelle der API. Es gibt bewusst keinen Fallback auf `app_state`, damit keine widersprüchlichen Anbieterstände ausgeliefert werden.
- Anbieter mit `admin_only = true` werden nie über diese Schnittstelle ausgegeben.
- Interne Notizen, Provisionsdaten, Einladungs- und Workflowdetails sowie das vollständige JSON-Payload werden nicht ausgegeben.
- Antworten werden nicht zwischengespeichert (`Cache-Control: private, no-store`).
- Der Token ist pro angebundenem System zu verwalten und bei einem Verdacht sofort in Vercel zu ersetzen.

## Rücknahme

Solange `PROVIDERS_READ_API_TOKEN` in Vercel entfernt oder ersetzt wird, ist die Route sofort nicht mehr nutzbar. Da diese Version rein lesend ist, sind weder Datenbankänderungen noch ein CRM-Rollback erforderlich.

Schreibende Endpunkte werden erst als getrennte, später freizugebende Ausbaustufe umgesetzt.
