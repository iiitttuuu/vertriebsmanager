-- =============================================================
-- BusinessOS / Vertriebsmanager - Gesamtes SQL Paket
-- Generiert aus allen supabase/*.sql Dateien
-- Datum: 2026-05-03
-- =============================================================

-- 1) Basis-Schema
\i supabase/schema.sql

-- 2) Basis Auth + RLS
\i supabase/auth_and_rls.sql

-- 3) Kern-Patches
\i supabase/patch_uuid_text_compat.sql
\i supabase/patch_providers_table.sql
\i supabase/patch_provider_workflow_permissions.sql
\i supabase/patch_provider_registry.sql
\i supabase/patch_provider_contact_fields.sql
\i supabase/patch_provider_notes.sql
\i supabase/patch_provider_notes_role_constraint.sql
\i supabase/patch_sales_phone_acquisition.sql
\i supabase/patch_app_state_active_write.sql
\i supabase/patch_conversation_notes.sql
\i supabase/patch_employee_management.sql
\i supabase/patch_firms_extended_fields.sql
\i supabase/patch_firms_admin_access.sql
\i supabase/patch_conversation_notes_admin_write.sql
\i supabase/patch_incoming_invoices.sql
\i supabase/patch_incoming_invoice_offer_links.sql
\i supabase/patch_vertriebsmitarbeiter_role.sql
\i supabase/patch_supaadmin_role.sql
\i supabase/patch_partner_requests_notifications.sql
\i supabase/patch_partner_requests_responsibility.sql
\i supabase/patch_desktop_realtime_sync.sql
\i supabase/patch_content_read_receipts.sql
\i supabase/patch_web_push_subscriptions.sql
\i supabase/patch_categories_neue_kat.sql
\i supabase/patch_ceo_secretary.sql
\i supabase/patch_ceo_secretary_ai.sql
\i supabase/patch_ceo_secretary_crm_links.sql
\i supabase/patch_ceo_secretary_security.sql

-- 4) Seed-Daten
\i supabase/seed_categories.sql
