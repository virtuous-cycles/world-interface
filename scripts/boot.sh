#!/usr/bin/env sh
# Boot the machine in dry-run with the guardian shell attached.
# Usage: scripts/boot.sh [--live]
set -e
cd "$(dirname "$0")/.."
[ -f .env ] || cp .env.example .env
exec npx tsx src/cli.ts shell "$@"
