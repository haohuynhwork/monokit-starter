#!/usr/bin/env bash
# Opens a shell in packages/db with DATABASE_URL pointing at the local db.
# Any arguments run as a command there instead (make/db.sh prisma db verify).
set -euo pipefail

. "$(dirname "${BASH_SOURCE[0]}")/common/env.sh"
load_env
export_database_url

cd "$root/packages/db"
# `prisma ...` runs the package's CLI without going through pnpm
export PATH="$PWD/node_modules/.bin:$PATH"

if [ $# -gt 0 ]; then
	exec "$@"
fi
echo "db shell: $PWD (DATABASE_URL=$DATABASE_URL). exit to leave."
exec "${SHELL:-bash}"
