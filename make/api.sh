#!/usr/bin/env bash
# Opens a shell in apps/api with the same env as `make dev:api`.
# Any arguments run as a command there instead (make/api.sh pnpm test).
set -euo pipefail

. "$(dirname "${BASH_SOURCE[0]}")/common/env.sh"
load_env
export_database_url
export PORT="${API_PORT:-3001}"

cd "$root/apps/api"

if [ $# -gt 0 ]; then
	exec "$@"
fi
echo "api shell: $PWD (PORT=$PORT, API_PREFIX=${API_PREFIX:-}, DATABASE_URL=$DATABASE_URL). exit to leave."
exec "${SHELL:-bash}"
