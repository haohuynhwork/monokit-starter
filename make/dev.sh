#!/usr/bin/env bash
# Runs packages (watch) + api + web; one Ctrl+C stops everything.
# Ctrl+C reaches every process (same process group); the trap then TERMs the
# full process tree of each job and KILLs whatever is still alive after 3s,
# so slow watchers (vite, nest --watch) can't keep the shell waiting.
set -u
cd "$(dirname "$0")/.."

pnpm --filter "./packages/*" build || exit

pids=()
start() { "$@" & pids+=("$!"); }

# Prints a pid and all its descendants.
tree() {
	local c
	for c in $(pgrep -P "$1"); do tree "$c"; done
	echo "$1"
}

alive() {
	local p
	for p in "$@"; do kill -0 "$p" 2>/dev/null && return 0; done
	return 1
}

cleanup() {
	trap '' INT TERM # a second Ctrl+C must not cut cleanup short
	trap - EXIT
	local all=() p i
	for p in "${pids[@]}"; do all+=($(tree "$p")); done
	kill -TERM "${all[@]}" 2>/dev/null
	for i in {1..30}; do
		alive "${all[@]}" || exit 0
		sleep 0.1
	done
	kill -KILL "${all[@]}" 2>/dev/null
	exit 0
}
trap cleanup INT TERM EXIT

start pnpm --filter "./packages/*" --parallel dev --no-clean
start ./make/api.sh pnpm start:dev
start ./make/web.sh pnpm dev
wait
