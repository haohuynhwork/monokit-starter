#!/usr/bin/env bash
# Opens a shell in apps/web with the env a host `vite dev` needs.
# Any arguments run as a command there instead (make/web.sh pnpm lint).
set -euo pipefail

. "$(dirname "${BASH_SOURCE[0]}")/common/env.sh"
load_env
# On the host, SSR reads and the /api proxy reach the api on its host port.
export API_URL="${API_URL:-http://localhost:${API_PORT:-3000}}"
export PORT="${WEB_PORT:-3002}"

cd "$root/apps/web"

if [ $# -gt 0 ]; then
	exec "$@"
fi
echo "web shell: $PWD (PORT=$PORT, API_URL=$API_URL, PUBLIC_WEB_URL=${PUBLIC_WEB_URL:-}). exit to leave."
exec "${SHELL:-bash}"
