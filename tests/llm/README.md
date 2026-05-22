# `llm` tier

Tests that require a live LLM provider. Costs money — run manually.

```bash
pnpm test:llm
```

The SDK does not currently call an LLM directly, so this tier is empty.
Add cases here if a future SDK adapter starts calling a provider.
