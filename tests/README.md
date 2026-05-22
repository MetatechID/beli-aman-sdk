# Tests

Tests are split into three tiers by **what they require to run**:

| Tier | Dir | Requires | When |
|---|---|---|---|
| `unit` | `tests/unit/` | Nothing — pure logic, mocks, jsdom | Every PR (default in CI) |
| `browser` | `tests/browser/` | Real Chromium via Playwright (long-running) | Manual / on demand |
| `llm` | `tests/llm/` | A live LLM provider | Manual / on demand (costs money) |

## Commands

```bash
pnpm test                        # vitest — unit only (CI default)
pnpm test:browser                # playwright (needs `pnpm exec playwright install` once)
pnpm test:llm                    # vitest — llm tier
```

This is a UI SDK, so the **browser tier matters more here** than in the
sibling repos — most real behavior of `BeliAmanButton` etc. only manifests
in a real browser. Expect this tier to grow.

CI runs `pnpm test` only.
