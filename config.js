window.APP_CONFIG = {
  // Google Maps: benoetigt Maps JavaScript API + Places API.
  GOOGLE_MAPS_API_KEY: "AIzaSyAvlLjTHPxXqJERtv6Po2H3QO89BziN9lw",

  // Supabase (Frontend/Browser safe Werte):
  // URL: https://<project-ref>.supabase.co
  // ANON KEY: Project Settings > API > anon public
  SUPABASE_URL: "https://syczkpbghpfmczqwtgei.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_lF5fGMVWbuBDkUKFxbpb3g_CP6kwKWi",

  // Tabelle fuer den zentralen App-Status.
  SUPABASE_STATE_TABLE: "app_state",

  // Lesebestätigungen für Hilfe-Inhalte und Mitarbeiter-Nachrichten.
  SUPABASE_CONTENT_READ_RECEIPTS_TABLE: "content_read_receipts",

  // Dedizierte Tabelle fuer Anbieterstammdaten.
  SUPABASE_PROVIDERS_TABLE: "providers",

  // Relationale Tabellen fuer Gesprächsnotizen-Modul.
  SUPABASE_CONVERSATION_THREADS_TABLE: "conversation_threads",
  SUPABASE_CONVERSATION_NOTES_TABLE: "conversation_notes",
  SUPABASE_CONVERSATION_TASKS_TABLE: "conversation_tasks",
  SUPABASE_CONVERSATION_ORGANIZATIONS_TABLE: "conversation_organizations",

  // Privater Arbeitsbereich des CEO: nur Superadmin kann diese Einträge lesen.
  SUPABASE_CEO_SECRETARY_TABLE: "ceo_secretary_entries",
  SUPABASE_CEO_SECRETARY_PREFERENCES_TABLE: "ceo_secretary_preferences",
  SUPABASE_CEO_SECRETARY_LINKS_TABLE: "ceo_secretary_entry_links",

  // Relationale Tabelle fuer neue Partner-/Website-Anfragen.
  SUPABASE_PARTNER_REQUESTS_TABLE: "partner_requests",

  // Relationale Tabellen für Eingangsrechnungen.
  SUPABASE_INCOMING_INVOICES_TABLE: "incoming_invoices",
  SUPABASE_INCOMING_INVOICE_FILES_TABLE: "incoming_invoice_files",
  SUPABASE_INCOMING_INVOICE_EVENTS_TABLE: "incoming_invoice_events",
};
