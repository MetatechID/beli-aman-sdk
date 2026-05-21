# @jaringan-dagang/beli-aman-sdk

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/@jaringan-dagang/beli-aman-sdk)](https://www.npmjs.com/package/@jaringan-dagang/beli-aman-sdk)

Embeddable buyer-protection / escrow for Indonesian DTC commerce.
Drop the `<BayarAman>` React component into your checkout — funds are
held in escrow, released D+3 after delivery (or earlier on customer
confirm).

```
┌─────────────────────────────────────────────────────────┐
│  Customer checkout                                      │
│ ─────────────────────────────────────────────────────── │
│  [items + total]                                        │
│  [address form]                                         │
│                                                         │
│  ┌────────────────────────────────────────┐            │
│  │  🛡️  Bayar Aman                         │ ← this    │
│  │   Funds held in escrow until delivery  │           │
│  └────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

## What it does

- **Escrow checkout modal** — collects payment + holds funds.
- **Identity provider** — drop-in Firebase-based sign-in for
  cross-storefront customer identity (BeliAmanProfile).
- **Order timeline UI** — paid → packed → shipped → delivered →
  released, with the customer-side "I got my package" confirm button.

It speaks the Beckn protocol over the
[`jaringan-dagang-protocol`](https://github.com/MetatechID/jaringan-dagang-protocol)
network — so any BPP on that network plugs into your storefront
without per-merchant integration work.

## Install

```bash
npm install @jaringan-dagang/beli-aman-sdk
# or
pnpm add @jaringan-dagang/beli-aman-sdk
```

## Quickstart

```tsx
import { BayarAman, BeliAmanProvider } from "@jaringan-dagang/beli-aman-sdk";

export default function App() {
  return (
    <BeliAmanProvider
      apiKey={process.env.NEXT_PUBLIC_BELI_AMAN_KEY!}
      brand="my-storefront"
    >
      <Checkout />
    </BeliAmanProvider>
  );
}

function Checkout({ cart }) {
  return <BayarAman cart={cart} onPaid={(order) => router.push(`/orders/${order.id}`)} />;
}
```

See [`examples/`](examples/) for end-to-end React + Next.js setups.

## Why this exists

Indonesian e-commerce trust is gated by buyer-protection. Marketplaces
(Tokopedia, Shopee) bundle it with the platform; DTC brands don't
have it. This SDK lets a single-brand storefront offer the same
escrow guarantee — backed by the
[`jaringan-dagang-protocol`](https://github.com/MetatechID/jaringan-dagang-protocol)
network's dispute resolution.

## Compatibility

- React 18+ / Next.js 14+
- Server-side: Node 20+
- Works with any Beckn-compliant BPP (the reference one is
  [`jaringan-dagang-protocol/apps/beli-aman-bap`](https://github.com/MetatechID/jaringan-dagang-protocol/tree/main/apps/beli-aman-bap))

## License

Apache-2.0. See [LICENSE](LICENSE). Contributions welcome — see
[CONTRIBUTING.md](CONTRIBUTING.md).

Maintained by [@MetatechID](https://github.com/MetatechID).
Reference deployment: <https://safiya.beliaman.com>.
