#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."

PORT="${PORT:-8000}"

printf 'Serving Prompt Library App at http://localhost:%s/\n' "$PORT"
printf 'Press Ctrl+C to stop.\n'

exec python3 -m http.server "$PORT"
