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

request_table_paginated() {
  local table_name="$1"
  local query="$2"
  local body_file="$backup_dir/${table_name}.json"
  local header_file="$backup_dir/${table_name}.headers.txt"
  local page_file="$backup_dir/${table_name}.page.json"
  local page_size=1000
  local offset=0
  local http_code=""

  printf '[]' > "$body_file"
  : > "$header_file"

  while true; do
    http_code="$(
      curl -sS \
        -o "$page_file" \
        -D "$header_file" \
        -w "%{http_code}" \
        "${SUPABASE_URL}/rest/v1/${table_name}?${query}&limit=${page_size}&offset=${offset}" \
        -H "apikey: ${api_key}" \
        -H "Authorization: Bearer ${auth_token}" \
        -H "Accept: application/json" \
        -H "Prefer: count=exact"
    )"

    if [[ "$http_code" != "200" ]] || ! jq -e 'type == "array"' "$page_file" >/dev/null; then
      printf "%s" "$http_code" > "$backup_dir/${table_name}.status"
      return 0
    fi

    jq -s '.[0] + .[1]' "$body_file" "$page_file" > "$body_file.next"
    mv "$body_file.next" "$body_file"

    local page_count
    page_count="$(jq 'length' "$page_file")"
    if [[ "$page_count" -lt "$page_size" ]]; then
      printf "%s" "$http_code" > "$backup_dir/${table_name}.status"
      rm -f "$page_file"
      return 0
    fi
    offset=$((offset + page_size))
  done
}

require_successful_backup() {
  local table_name="$1"
  local status
  status="$(cat "$backup_dir/${table_name}.status")"
  if [[ "$status" != "200" ]]; then
    echo "ERROR: Backup von ${table_name} fehlgeschlagen (HTTP ${status}). Kein unvollständiges Backup verwenden." >&2
    exit 1
  fi
}

request_table "app_state" "id=eq.main&select=*"
request_table "provider_registry" "select=*"
request_table_paginated "providers" "select=*&order=id.asc"

require_successful_backup "app_state"
require_successful_backup "provider_registry"
require_successful_backup "providers"

if ! jq -e 'type == "array" and length == 1 and .[0].id == "main"' "$backup_dir/app_state.json" >/dev/null; then
  echo "ERROR: app_state/main wurde nicht vollständig gesichert. Kein unvollständiges Backup verwenden." >&2
  exit 1
fi

shasum -a 256 "$backup_dir"/app_state.json "$backup_dir"/provider_registry.json "$backup_dir"/providers.json > "$backup_dir/checksums.sha256"

{
  echo "backup_timestamp_utc=$timestamp_utc"
  echo "auth_mode=$auth_mode"
  echo "supabase_project_ref=$(echo "$SUPABASE_URL" | sed -E 's#https://([^.]+)\..*#\1#')"
  echo "app_state_http_status=$(cat "$backup_dir/app_state.status")"
  echo "provider_registry_http_status=$(cat "$backup_dir/provider_registry.status")"
  echo "providers_http_status=$(cat "$backup_dir/providers.status")"
  echo "app_state_content_range=$(rg -i '^content-range:' "$backup_dir/app_state.headers.txt" | sed -E 's/\r$//' || true)"
  echo "provider_registry_content_range=$(rg -i '^content-range:' "$backup_dir/provider_registry.headers.txt" | sed -E 's/\r$//' || true)"
  echo "providers_content_range=$(rg -i '^content-range:' "$backup_dir/providers.headers.txt" | sed -E 's/\r$//' || true)"
  echo "providers_count=$(jq 'length' "$backup_dir/providers.json")"
  echo "backup_dir=$backup_dir"
} > "$backup_dir/manifest.txt"

echo "Backup erstellt: $backup_dir"
