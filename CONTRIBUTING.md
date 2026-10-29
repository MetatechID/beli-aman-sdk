# Contributing

Thanks for your interest in `@jaringan-dagang/beli-aman-sdk`.

## Before you start

- Apache-2.0 licensed; contributions follow the same license.
- Read the [Code of Conduct](CODE_OF_CONDUCT.md).
- Check [open issues](https://github.com/MetatechID/beli-aman-sdk/issues) first.

## Dev setup

```bash
corepack enable
git clone https://github.com/MetatechID/beli-aman-sdk.git
cd beli-aman-sdk
pnpm install
pnpm dev          # watch + storybook
pnpm test
pnpm build
```

## Making a change

1. Branch from `main`.
2. Make your change in the smallest possible diff.
3. Add a changeset:
   ```bash
   pnpm changeset
   ```
4. Open a PR. CI runs lint + tests + builds.
5. On merge, changesets opens a Release PR; merging that publishes to npm.

## What we look for

- Tested. New components ship with a Storybook story + tests.
- Accessible. WCAG AA — keyboard nav, screen-reader labels, focus rings.
- No business logic in the SDK. The SDK is the UI + Beckn glue;
  business rules live on the BAP.
- No tenant-specific styling. Use CSS variables / theme tokens so
  consumers can rebrand.

## Reporting bugs

Open an issue. Minimal repro + version + browser.

## Security

security@metatech.id — don't open a public issue.

### Secret scanning (JD-035)

Requires Bash, Git, and Docker. Fetch the reviewed scanner image once (network is
needed only for this explicit pull):

```bash
docker pull zricethezav/gitleaks:v8.24.3@sha256:e1b35e12a8c6fa8901f060459cfb6b2fc4c484d3afbe3b029733a3bbfab07055
# Opt in for this clone; check existing hooks before replacing their configuration.
git config --local core.hooksPath .githooks
bash scripts/test-secret-scanning.sh
bash scripts/scan-secrets.sh tree
bash scripts/scan-secrets.sh history
```

The pre-commit hook scans a disposable snapshot of the **Git index**, including
initial commits, sparse entries, and partially staged files, not the unstaged
working copy. Raw indexed blobs are scanned without running checkout filters.
It scans the entire proposed tree, so pre-existing indexed findings also block it.
Submodule contents require separate scans in their own repositories.
To remove this opt-in, use `git config --local --unset core.hooksPath` (or restore
your previous hook path). Local hooks are optional and bypassable; CI is the
independent enforcement layer.

CI separately scans the current checkout and `git log --all` history after a full
fetch, including fetched branches and tags. Full-history merge diffs are enabled. Local history scans cover local refs;
fetch all relevant refs before an audit. Shallow repositories fail closed. Neither
scan covers unreachable objects, unadvertised refs, remote caches, or other clones.
Repository administrators must require **Current tree and reachable history** in
branch protection; adding a workflow alone does not configure that setting.

The image digest pins the built-in rules extended by `.gitleaks.toml`. Update the
image references together in the wrapper, workflow, and these instructions, then
rerun the fixtures. There is no baseline, repository-wide allowlist, or path
exclusion. Inline `gitleaks:allow` and `.gitleaksignore` suppression are disabled.
Policy changes require security review, not a blanket exception for history.

Every scan runs offline (`--network none`) with a read-only source mount and
`--redact=100`. Raw scanner output is never printed or uploaded: even redacted
reports can contain sensitive source lines. Only finding counts/status are
reported. Temporary diagnostics and snapshots are private and deleted on exit.
Errors fail closed; fetch the pinned image explicitly if it is missing. Tree
scans include untracked files (but not Git metadata); build/dependency files may
increase scan time. Symlinks are not followed.

If a scan blocks, do not paste secret values or source lines into issues or logs.
Contact the security address privately; record only rule/path/count if needed.
Rotate or revoke exposed credentials first and remove current tracked values in
a separately reviewed change. Existing history findings must remain blocking
until separately authorized remediation; do not hide them with a baseline.
Coordinated history remediation must account for affected branches, tags,
collaborator clones, and retained copies, and requires explicit operator approval.
Scanner installation is **not** credential revocation or completion of a secret
purge. Do not rewrite history or force-push as part of routine scanner setup.
