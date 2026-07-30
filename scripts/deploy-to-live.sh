#!/usr/bin/env bash
set -euo pipefail

LIVE_ALIAS="project-xykur.vercel.app"

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$repo_root" ]]; then
  echo "DEPLOY ABGEBROCHEN: Dieses Skript muss innerhalb eines Git-Repositories laufen." >&2
  exit 1
fi
cd "$repo_root"

# Direkte Vercel-Deployments verwenden den lokalen Arbeitsordner. Ein nicht
# gespeicherter oder unklarer Stand darf deshalb niemals versehentlich live
# gehen. Ein Release ist ausschließlich vom aktuell gepushten main erlaubt.
if [[ -n "$(git status --porcelain)" ]]; then
  echo "DEPLOY ABGEBROCHEN: Der Arbeitsordner enthält nicht versionierte Änderungen." >&2
  echo "Bitte Änderungen zuerst prüfen, committen und pushen – oder bewusst verwerfen." >&2
  git status --short >&2
  exit 1
fi

current_branch="$(git branch --show-current)"
if [[ "$current_branch" != "main" ]]; then
  echo "DEPLOY ABGEBROCHEN: Releases sind nur vom Branch main erlaubt (aktuell: ${current_branch:-detached})." >&2
  exit 1
fi

git fetch --quiet origin main
local_revision="$(git rev-parse HEAD)"
remote_revision="$(git rev-parse origin/main)"
if [[ "$local_revision" != "$remote_revision" ]]; then
  echo "DEPLOY ABGEBROCHEN: Lokales main stimmt nicht exakt mit origin/main überein." >&2
  echo "Bitte zuerst den gewünschten Stand prüfen und nach origin/main pushen." >&2
  exit 1
fi

deploy_output="$(vercel --prod 2>&1)"
printf '%s\n' "$deploy_output"

deployment_url="$(
  printf '%s\n' "$deploy_output" |
    sed -nE 's/^Production:[[:space:]]+(https:\/\/[^[:space:]]+).*/\1/p' |
    tail -n 1
)"

if [[ -z "$deployment_url" ]]; then
  echo "Could not determine production deployment URL." >&2
  exit 1
fi

vercel alias set "$deployment_url" "$LIVE_ALIAS"
echo "Live alias updated: https://$LIVE_ALIAS -> $deployment_url"
