#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
for cmd in php node python3; do command -v "$cmd" >/dev/null || { echo "Missing: $cmd" >&2; exit 1; }; done
python3 -m json.tool module/manifest.json >/dev/null
for f in module/*.php module/actions/*.php module/views/*.php; do php -l "$f" >/dev/null; done
for f in module/assets/js/*.js; do node --check "$f"; done
node --test tests/*.test.js
bash -n scripts/*.sh
printf 'Preflight local OK; Zabbix 7.0 runtime/database/CSRF remain UNVERIFIED.\n'