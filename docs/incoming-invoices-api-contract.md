# Eingangsrechnungen: DB- und API-Vertrag

Dieses Dokument beschreibt den technischen Vertrag fuer das neue Rechnungs-Tool:
- Freigabe-offene Rechnungen
- Bereits bezahlte Rechnungen
- NAS-basierte Belegablage (Dateiinhalt auf NAS, Pfad in DB)

## 1) Statusmodell

### Freigabe (`approval_status`)
- `freigabe_offen`
- `freigegeben`
- `abgelehnt`
- `nicht_noetig`

### Zahlung (`payment_status`)
- `offen`
- `teilbezahlt`
- `bezahlt`

Wichtige Regel:
- `payment_status = bezahlt` ist nicht erlaubt, wenn `approval_status = freigabe_offen`.

## 2) Tabellen

### `incoming_invoices`
Enthaelt Stammdaten und Fachstatus der Rechnung.

Pflichtfelder:
- `id` (uuid)
- `invoice_date` (date)
- `supplier_name` (text)
- `total_net`, `total_tax`, `total_gross` (numeric)

Kernfelder:
- `invoice_number`, `due_date`, `currency`, `category`, `cost_center`, `project_code`
- `supplier_company_id` (Verknüpfung zur Firma aus dem Firmenmodul)
- `approval_status`, `payment_status`, `paid_at`, `payment_method`
- `external_booking_ref`, `notes`
- Audit-Spalten: `created_at`, `updated_at`, `created_by_user_id`, `updated_by_user_id`
- Freigabe-Spalten: `approved_at`, `approved_by_user_id`, `rejected_at`, `rejected_by_user_id`, `rejected_reason`

### `incoming_invoice_files`
Dateimetadaten je Rechnung.

Kernfelder:
- `invoice_id`
- `storage_mode` (`nas` oder `supabase`)
- `nas_path` (bei NAS verpflichtend)
- `original_name`, `mime_type`, `size_bytes`, `checksum_sha256`
- `uploaded_at`, `uploaded_by_user_id`

### `incoming_invoice_approvers`
Liste zusaetzlicher Freigabeberechtigter neben Admin/Superadmin.

### `incoming_invoice_events`
Einfache Historie (created/updated/approved/rejected/marked_paid etc.).

## 3) Rollen und Rechte

- Lesen: alle aktiven Mitarbeiter
- Erstellen/Bearbeiten: alle aktiven Mitarbeiter
- Loeschen: nur Admin/Superadmin
- Freigabestatus auf `freigegeben`/`abgelehnt` setzen: nur Freigabeberechtigte
  - Admin/Superadmin immer
  - plus Eintraege aus `incoming_invoice_approvers`

## 4) NAS-Ablagevertrag

Empfohlener Pfad:
- `/invoices/{YYYY}/{MM}/{invoice_id}_{original_name}`

Beispiel:
- `/invoices/2026/05/2f80..._rechnung-4711.pdf`

Ablauf:
1. API nimmt Upload entgegen.
2. API schreibt Datei auf NAS.
3. API speichert Metadaten in `incoming_invoice_files` inklusive `nas_path`.
4. Download laeuft immer ueber API (mit Rechtepruefung), nie direkter SMB-Browserzugriff.

## 5) REST-API-Vertrag

## Auth
- Header: `Authorization: Bearer <supabase_jwt>`
- Jede Route prueft aktiven Mitarbeiterstatus.

## 5.1 Rechnung anlegen
`POST /api/invoices`

Request JSON:
```json
{
  "invoice_number": "RE-2026-0042",
  "supplier_name": "Muster GmbH",
  "supplier_vat_id": "ATU12345678",
  "invoice_date": "2026-05-01",
  "due_date": "2026-05-15",
  "currency": "EUR",
  "total_net": 1000.0,
  "total_tax": 200.0,
  "total_gross": 1200.0,
  "category": "Marketing",
  "cost_center": "HQ",
  "project_code": "PR-24",
  "notes": "April Kampagne"
}
```

Response `201`:
```json
{
  "id": "uuid",
  "approval_status": "freigabe_offen",
  "payment_status": "offen"
}
```

## 5.2 Rechnungsliste
`GET /api/invoices?approval_status=&payment_status=&from=&to=&supplier=&q=&page=&page_size=`

Response `200`:
```json
{
  "items": [],
  "page": 1,
  "page_size": 25,
  "total": 0
}
```

## 5.3 Rechnungsdetail
`GET /api/invoices/:id`

Response `200`:
```json
{
  "invoice": {},
  "files": [],
  "events": []
}
```

## 5.4 Rechnung bearbeiten
`PATCH /api/invoices/:id`

Patchbare Felder:
- Stammdaten und Notizen
- `approval_status` (nur Freigabeberechtigte fuer finalen Status)
- `payment_status`, `paid_at`, `payment_method`

## 5.5 Zur Freigabe einreichen
`POST /api/invoices/:id/submit-approval`

Effekt:
- setzt `approval_status = freigabe_offen`
- erzeugt Event `approval_submitted`

## 5.6 Freigeben
`POST /api/invoices/:id/approve`

Request JSON:
```json
{ "note": "Budget geprueft" }
```

Effekt:
- `approval_status = freigegeben`
- `approved_at`, `approved_by_user_id` setzen
- Event `approved`

## 5.7 Ablehnen
`POST /api/invoices/:id/reject`

Request JSON:
```json
{ "reason": "Betrag unklar" }
```

Effekt:
- `approval_status = abgelehnt`
- `rejected_at`, `rejected_by_user_id`, `rejected_reason` setzen
- Event `rejected`

## 5.8 Als bezahlt markieren
`POST /api/invoices/:id/mark-paid`

Request JSON:
```json
{
  "paid_at": "2026-05-03T09:00:00Z",
  "payment_method": "ueberweisung",
  "external_booking_ref": "DATEV-2026-9981"
}
```

Effekt:
- `payment_status = bezahlt`
- Event `marked_paid`

## 5.9 Datei hochladen (NAS)
`POST /api/invoices/:id/files`

Content-Type:
- `multipart/form-data`
- Feld: `file`

Response `201`:
```json
{
  "file_id": "uuid",
  "nas_path": "/invoices/2026/05/uuid_rechnung.pdf",
  "original_name": "rechnung.pdf"
}
```

## 5.10 Datei herunterladen
`GET /api/invoices/:id/files/:file_id/download`

Response:
- `200` mit Datei-Stream

## 5.11 Datei loeschen
`DELETE /api/invoices/:id/files/:file_id`

Response:
- `204`

## 5.12 Dashboard/Overview
`GET /api/invoices/overview?from=2026-01-01&to=2026-12-31`

Response `200`:
```json
{
  "totals": {
    "open_amount": 0,
    "paid_amount": 0,
    "overdue_amount": 0
  },
  "counts": {
    "freigabe_offen": 0,
    "freigegeben": 0,
    "abgelehnt": 0,
    "bezahlt": 0
  },
  "by_month": [],
  "by_category": [],
  "by_supplier": []
}
```

## 5.13 Export fuer externe Buchhaltung
`GET /api/invoices/export.csv?from=&to=&status=`

Response:
- `200 text/csv`

CSV-Minimumspalten:
- `invoice_number`
- `supplier_name`
- `invoice_date`
- `due_date`
- `total_net`
- `total_tax`
- `total_gross`
- `currency`
- `approval_status`
- `payment_status`
- `paid_at`
- `external_booking_ref`
- `nas_path`

## 6) Frontend-Views (minimal)

1. Liste `Freigabe offen`
- Filter, Schnellaktionen (freigeben/ablehnen)

2. Liste `Bereits bezahlt`
- Zahlungsdatum, Methode, Export

3. Detailseite
- Rechnung, Statushistorie, Dateien, Notizen

## 7) Umsetzung in eurem Repo

- SQL-Migration: `supabase/patch_incoming_invoices.sql`
- Dieses Vertragsdokument: `docs/incoming-invoices-api-contract.md`
