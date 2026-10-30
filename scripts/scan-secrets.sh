#!/usr/bin/env bash
# Never expose scanner diagnostics: even fully redacted reports may contain source lines.
set -euo pipefail
umask 077
readonly IMAGE='zricethezav/gitleaks:v8.24.3@sha256:e1b35e12a8c6fa8901f060459cfb6b2fc4c484d3afbe3b029733a3bbfab07055'
mode=${1:-tree}
case "$mode" in tree|history|staged) ;; *) printf 'Usage: %s {tree|history|staged}\n' "$0" >&2; exit 2 ;; esac
root=$(git rev-parse --show-toplevel)
if [[ "$mode" == history && $(git -C "$root" rev-parse --is-shallow-repository) != false ]]; then
  printf 'Secret scan history: incomplete shallow history; fetch full history first.\n' >&2
  exit 2
fi
scratch=$(mktemp -d)
trap 'rm -rf -- "$scratch"' EXIT
mkdir "$scratch/output"
printf '{{ len . }}\n' > "$scratch/count.tmpl"
source_path=$root
args=(dir /repo)
if [[ "$mode" == staged ]]; then
  # Materialize the index, not the worktree or a patch (including initial commits).
  mkdir "$scratch/index"
  # Read raw blobs: checkout-index can run smudge filters and omit sparse entries.
  git -C "$root" ls-files --stage -z > "$scratch/entries"
  while IFS= read -r -d '' entry; do
    metadata=${entry%%$'\t'*}
    path=${entry#*$'\t'}
    read -r permissions object stage <<< "$metadata"
    if [[ "$stage" != 0 ]]; then
      printf 'Secret scan staged: unresolved index; resolve conflicts first.\n' >&2
      exit 2
    fi
    # Gitlinks store a commit, not file contents; scan submodules separately.
    [[ "$permissions" == 160000 ]] && continue
    mkdir -p -- "$scratch/index/$(dirname -- "$path")"
    # Symlink blobs become regular files, so their target text is scanned safely.
    git -C "$root" cat-file blob "$object" > "$scratch/index/$path" 2>/dev/null
  done < "$scratch/entries"
  source_path=$scratch/index
elif [[ "$mode" == history ]]; then
  args=(git /repo '--log-opts=--all --full-history -m')
fi
status=0
docker run --rm --pull never --network none --read-only --cap-drop ALL \
  --security-opt no-new-privileges --user "$(id -u):$(id -g)" \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  -e GIT_CONFIG_COUNT=1 -e GIT_CONFIG_KEY_0=safe.directory -e GIT_CONFIG_VALUE_0=/repo \
  --mount "type=bind,src=$source_path,dst=/repo,readonly" \
  --mount "type=bind,src=$root/.gitleaks.toml,dst=/policy.toml,readonly" \
  --mount "type=bind,src=$scratch/count.tmpl,dst=/count.tmpl,readonly" \
  --mount "type=bind,src=$scratch/output,dst=/output" \
  "$IMAGE" "${args[@]}" --config /policy.toml --redact=100 \
  --no-banner --no-color --ignore-gitleaks-allow --gitleaks-ignore-path /dev/null \
  --exit-code 1 --report-format template --report-template /count.tmpl \
  --report-path /output/count > "$scratch/diagnostics" 2>&1 || status=$?
if [[ "$status" != 0 && "$status" != 1 ]]; then
  printf 'Secret scan %s: scanner error (exit %s); diagnostics suppressed.\n' "$mode" "$status" >&2
  exit 2
fi
count=''
if [[ -f "$scratch/output/count" ]]; then
  read -r count < "$scratch/output/count" || :
fi
if [[ ! "$count" =~ ^[0-9]+$ ]]; then
  printf 'Secret scan %s: missing/invalid result; diagnostics suppressed.\n' "$mode" >&2
  exit 2
fi
if [[ "$status" == 1 || "$count" != 0 ]]; then
  printf 'Secret scan %s: BLOCKED (%s findings).\n' "$mode" "$count" >&2
  exit 1
fi
printf 'Secret scan %s: PASS (0 findings).\n' "$mode"
