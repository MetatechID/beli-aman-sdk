#!/usr/bin/env bash
# Integration tests use disposable repositories and synthetic values only.
set -euo pipefail
umask 077
root=$(git rev-parse --show-toplevel)
scratch=$(mktemp -d)
trap 'rm -rf -- "$scratch"' EXIT
# Do not let an enclosing hook redirect fixture Git operations to the caller's index.
unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_COMMON_DIR GIT_OBJECT_DIRECTORY GIT_ALTERNATE_OBJECT_DIRECTORIES
mkdir "$scratch/repo"
cd "$scratch/repo"
git init -q
git config user.name 'Secret Scanner Fixture'
git config user.email 'fixture@example.invalid'
git config commit.gpgsign false
mkdir scripts .githooks
cp "$root/scripts/scan-secrets.sh" scripts/
cp "$root/.githooks/pre-commit" .githooks/
cp "$root/.gitleaks.toml" .
git config core.hooksPath .githooks
checks=0
expect() {
  local expected=$1
  shift
  local status=0
  "$@" > "$scratch/result" 2>&1 || status=$?
  if [[ "$status" != "$expected" ]]; then
    printf 'FAIL: synthetic fixture check %s (expected exit %s, got %s); output suppressed.\n' "$((checks + 1))" "$expected" "$status" >&2
    exit 1
  fi
  # Even synthetic source values must never escape wrapper output.
  if grep -Fq "$sentinel" "$scratch/result"; then
    printf 'FAIL: fixture value appeared in output.\n' >&2
    exit 1
  fi
  checks=$((checks + 1))
}
# Assemble rather than store a scanner-triggering literal in this test file.
sentinel="ghp_$(printf 'Q7r9V2z6X4m8N3b5C1d0F9h2J6k4L8p3S5t7')"
printf 'clean fixture\n' > sample.txt
expect 0 bash scripts/scan-secrets.sh tree
git add .
expect 0 .githooks/pre-commit
expect 0 git commit -qm 'Clean fixture'
expect 0 bash scripts/scan-secrets.sh history
printf 'token = "%s" # gitleaks:allow\n' "$sentinel" > sample.txt
expect 1 bash scripts/scan-secrets.sh tree
git add sample.txt
printf 'clean worktree, unsafe index\n' > sample.txt
expect 1 .githooks/pre-commit
expect 1 git commit -qm 'Must be blocked'
git update-index --skip-worktree sample.txt
expect 1 .githooks/pre-commit
git update-index --no-skip-worktree sample.txt
# The inverse also matters: unstaged content is not the proposed commit.
git add sample.txt
printf 'token = "%s"\n' "$sentinel" > sample.txt
expect 0 .githooks/pre-commit
git add sample.txt
# Intentionally seed synthetic history without invoking the hook.
git -c core.hooksPath=/dev/null commit -qm 'Synthetic historical fixture'
printf 'clean again\n' > sample.txt
git add sample.txt
expect 0 git commit -qm 'Remove synthetic fixture'
expect 0 bash scripts/scan-secrets.sh tree
expect 1 bash scripts/scan-secrets.sh history
# Reachable non-current branches must be scanned as well.
git branch retained-fixture HEAD~1
git checkout -q --orphan clean-only
git -c core.hooksPath=/dev/null commit -qm 'Clean independent history'
expect 1 bash scripts/scan-secrets.sh history
# Prevent accidental shallow-history success.
git clone -q --depth 1 --no-local "file://$scratch/repo" "$scratch/shallow"
cd "$scratch/shallow"
expect 2 bash scripts/scan-secrets.sh history
printf 'PASS: %s synthetic secret-scanning checks.\n' "$checks"
