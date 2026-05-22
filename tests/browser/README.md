# `browser` tier

Playwright tests in real Chromium. This SDK ships UI components — the
checkout modal, identity flow, etc. — and most of the interesting
behavior only manifests in a real browser.

```bash
pnpm exec playwright install          # one-time
pnpm test:browser
```

Drop `*.spec.ts` files in here.
