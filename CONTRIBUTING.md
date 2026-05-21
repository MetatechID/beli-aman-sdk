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
