window.APP_CONFIG = {
  // Google Maps: benoetigt Maps JavaScript API + Places API.
  GOOGLE_MAPS_API_KEY: "AIzaSyAvlLjTHPxXqJERtv6Po2H3QO89BziN9lw",

  // Supabase (Frontend/Browser safe Werte):
  // URL: https://<project-ref>.supabase.co
  // ANON KEY: Project Settings > API > anon public
  SUPABASE_URL: "https://syczkpbghpfmczqwtgei.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5Y3prcGJnaHBmbWN6cXd0Z2VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MTgyODksImV4cCI6MjA5MDM5NDI4OX0.pZ03H2BQtFVwWAzAvg3Aqr9q-6IlCRnORtiAIwqPaQ4",

  // Tabelle fuer den zentralen App-Status.
  SUPABASE_STATE_TABLE: "app_state",

  // Relationale Tabellen fuer Gesprächsnotizen-Modul.
  SUPABASE_CONVERSATION_THREADS_TABLE: "conversation_threads",
  SUPABASE_CONVERSATION_NOTES_TABLE: "conversation_notes",
  SUPABASE_CONVERSATION_TASKS_TABLE: "conversation_tasks",
  SUPABASE_CONVERSATION_ORGANIZATIONS_TABLE: "conversation_organizations",

  // Relationale Tabellen für Eingangsrechnungen.
  SUPABASE_INCOMING_INVOICES_TABLE: "incoming_invoices",
  SUPABASE_INCOMING_INVOICE_FILES_TABLE: "incoming_invoice_files",
  SUPABASE_INCOMING_INVOICE_EVENTS_TABLE: "incoming_invoice_events",
};
