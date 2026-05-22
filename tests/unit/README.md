# `unit` tier

Short, isolated tests. No real network, no real browser (jsdom is fine).
Anything in this tier should finish in milliseconds.

Default tier — `pnpm test` runs it. Drop `*.test.ts(x)` files in here.
