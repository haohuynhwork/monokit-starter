# Sets up the current shell for this repo: a `kit` command (runs ./kit from any
# directory) and tab completion for `kit` / `./kit`. Nothing is installed anywhere.
# Load it with `. ./kit` from the repo root (or `. make/completion.bash`).

_monokit_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)

kit() { "$_monokit_root/kit" "$@"; }

# Completes the targets listed by `make help` (those with a `## description`).
_monokit_kit() {
	local cur=${COMP_LINE:0:COMP_POINT}
	cur=${cur##* }
	[[ $cur == -* || $cur == *=* ]] && return
	local targets
	targets=$(make --no-print-directory -C "$_monokit_root" help 2>/dev/null |
		sed -E 's/\x1b\[[0-9;]*m//g' | awk '/^  / { print $1 }')
	COMPREPLY=($(compgen -W "$targets" -- "$cur"))
	# Bash splits words on ":", so reply with only the part after the last one.
	[[ $cur == *:* ]] && COMPREPLY=("${COMPREPLY[@]#"${cur%:*}:"}")
}

complete -F _monokit_kit kit ./kit
