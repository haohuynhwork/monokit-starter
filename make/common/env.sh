# Shared env helpers for make/*.sh. Source it, then call what the command needs:
#   . "$(dirname "${BASH_SOURCE[0]}")/common/env.sh"
#   load_env
#   export_database_url

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Values from .env, so scripts also work when run without make. Variables
# already set in the environment win over .env.
load_env() {
	if [ -f "$root/.env" ]; then
		local saved
		saved="$(export -p | sed 's/^declare -x /export /')"
		set -a
		. "$root/.env"
		set +a
		eval "$saved"
	fi
}

# Prints the Postgres URL: database_url [host] [port]
# Defaults match compose.yaml for when .env is missing.
database_url() {
	local host="${1:-localhost}" port="${2:-${DB_PORT:-5432}}"
	echo "postgres://${POSTGRES_USER:-app}:${POSTGRES_PASSWORD:-app}@$host:$port/${POSTGRES_DB:-app}"
}

# Apps on the host reach Postgres via its published port, not `db`.
export_database_url() {
	export DATABASE_URL="$(database_url)"
}
