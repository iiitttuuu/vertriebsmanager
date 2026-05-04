#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

timestamp_utc="$(date -u +"%Y%m%dT%H%M%SZ")"
backup_dir="$ROOT_DIR/backups/supabase/$timestamp_utc"
mkdir -p "$backup_dir"

extract_config_value() {
  local key="$1"
  rg -o "${key}:\\s*\"[^\"]+\"" -N "$ROOT_DIR/config.js" | sed -E 's/.*"([^"]+)"/\1/' | head -n1
}

extract_env_file_value() {
  local file_path="$1"
  local key="$2"
  if [[ ! -f "$file_path" ]]; then
    return 0
  fi
  rg -n "^${key}=" "$file_path" | tail -n1 | sed -E "s/^.*${key}=//" || true
}

extract_fallback_service_key() {
  local file_path="$1"
  if [[ ! -f "$file_path" ]]; then
    return 0
  fi
  rg -n "^sb_secret_[A-Za-z0-9._-]+$" "$file_path" | tail -n1 | sed -E 's/^[0-9]+://' || true
}

SUPABASE_URL="${SUPABASE_URL:-$(extract_config_value SUPABASE_URL)}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-$(extract_config_value SUPABASE_ANON_KEY)}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-$(extract_env_file_value "$ROOT_DIR/.env.local" SUPABASE_SERVICE_ROLE_KEY)}"
if [[ -z "${SUPABASE_SERVICE_ROLE_KEY}" ]]; then
  SUPABASE_SERVICE_ROLE_KEY="$(extract_fallback_service_key "$ROOT_DIR/.env.local")"
fi
SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:-}"

if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_ANON_KEY" ]]; then
  echo "ERROR: SUPABASE_URL/SUPABASE_ANON_KEY fehlen." >&2
  exit 1
fi

auth_mode="anon"
auth_token="$SUPABASE_ANON_KEY"
api_key="$SUPABASE_ANON_KEY"

if [[ -n "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
  auth_mode="service_role"
  auth_token="$SUPABASE_SERVICE_ROLE_KEY"
  api_key="$SUPABASE_SERVICE_ROLE_KEY"
elif [[ -n "$SUPABASE_ACCESS_TOKEN" ]]; then
  auth_mode="access_token"
  auth_token="$SUPABASE_ACCESS_TOKEN"
  api_key="$SUPABASE_ANON_KEY"
fi

request_table() {
  local table_name="$1"
  local query="$2"
  local body_file="$backup_dir/${table_name}.json"
  local header_file="$backup_dir/${table_name}.headers.txt"

  local http_code
  http_code="$(
    curl -sS \
      -o "$body_file" \
      -D "$header_file" \
      -w "%{http_code}" \
      "${SUPABASE_URL}/rest/v1/${table_name}?${query}" \
      -H "apikey: ${api_key}" \
      -H "Authorization: Bearer ${auth_token}" \
      -H "Accept: application/json" \
      -H "Prefer: count=exact"
  )"

  printf "%s" "$http_code" > "$backup_dir/${table_name}.status"
}

request_table "app_state" "id=eq.main&select=*"
request_table "provider_registry" "select=*"

shasum -a 256 "$backup_dir"/app_state.json "$backup_dir"/provider_registry.json > "$backup_dir/checksums.sha256"

{
  echo "backup_timestamp_utc=$timestamp_utc"
  echo "auth_mode=$auth_mode"
  echo "supabase_project_ref=$(echo "$SUPABASE_URL" | sed -E 's#https://([^.]+)\..*#\1#')"
  echo "app_state_http_status=$(cat "$backup_dir/app_state.status")"
  echo "provider_registry_http_status=$(cat "$backup_dir/provider_registry.status")"
  echo "app_state_content_range=$(rg -i '^content-range:' "$backup_dir/app_state.headers.txt" | sed -E 's/\r$//' || true)"
  echo "provider_registry_content_range=$(rg -i '^content-range:' "$backup_dir/provider_registry.headers.txt" | sed -E 's/\r$//' || true)"
  echo "backup_dir=$backup_dir"
} > "$backup_dir/manifest.txt"

echo "Backup erstellt: $backup_dir"
