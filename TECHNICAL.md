# @beli-aman/sdk — technical architecture

> Apache-2.0. Embed buyer-protection / escrow into any storefront
> that's running on the [Jaringan Dagang protocol](https://github.com/MetatechID/jaringan-dagang-protocol)
> network.

## Components

| Component | What it does |
|---|---|
| `<BeliAmanProvider>` | Provides Firebase Auth (named app `beli-aman-sdk` to avoid colliding with the host app's default Firebase) + a session-scoped `BeliAmanProfile` (cross-storefront customer identity, keyed on `google_sub`) |
| `<BayarAman>` | The checkout button + modal. Collects address, surfaces shipping options, holds payment in escrow, releases D+3 after delivery |
| `<OrderTimeline>` | Customer-facing order status: paid → packed → shipped → delivered → released, with the "I got my package" confirm button |
| `useBeliAman()` | Hook returning `{ profile, signIn, signOut, isLoading }` |
| `lib/api` | Server-side client for the BAP's `/api/v1/auth/exchange` + cart/checkout endpoints |

## Identity model

```
                  storefront site                      Beli Aman BAP
                ──────────────────                  ──────────────────
                                                 
   <BeliAmanProvider>                                 GET  /api/v1/profile
       │                                              POST /api/v1/auth/exchange
       │ initializes named Firebase app                       │
       │  "beli-aman-sdk"                                     │
       ▼                                                      │
   customer signs in (Google / Email-link / OTP)              │
       │                                                      │
       │ getIdToken() →  Bearer <jwt>                         │
       ▼                                                      │
   storefront /api/chat (Node)                                │
       │                                                      │
       │ exchanges token  ──────────────────────────────────► │
       │                                                      │ verifies via Firebase Admin SDK
       │                                                      │ looks up or creates BeliAmanProfile
       │                                                      │ keyed by Firebase.uid (which == google_sub)
       │   profile = { id, email, display_name, photo_url }   │
       │ ◄──────────────────────────────────────────────────  │
       ▼
   conversation rows in CRM Postgres use profile.id as customer_id
```

The SDK creates Firebase as a **named app** (not the default) so a
host storefront that *also* uses Firebase for its own purposes (e.g.
Analytics, push notifications) doesn't conflict. To grab the SDK's
token from the host app:

```ts
import { getApps, getAuth } from "firebase/app";
// Walk all initialized Firebase apps; the SDK's one is named "beli-aman-sdk".
const sdkApp = getApps().find(a => a.name === "beli-aman-sdk");
const token = sdkApp ? await getAuth(sdkApp).currentUser?.getIdToken() : null;
```

(This pattern is what the storefront's `app/api/chat/route.ts` uses
to thread BeliAman identity through to the bot bridge.)

## Escrow flow

```
    customer       BeliAmanSDK            BAP                     BPP                       seller
   ─────────       ──────────             ───                     ───                       ──────
   click <BayarAman>
      │
      │  fills form ──────►  collect billing/shipping
      │                      │
      │                      │  Beckn /select  ─────────────►   /on_select (quote)
      │                      │  Beckn /init    ─────────────►   /on_init   (final quote)
      │                      │  ◄────────────────────────────
      │                      │
      │  confirms ──────────►│  Beckn /confirm ────────────►   /on_confirm (order created)
      │                      │                                   │ Xendit invoice
      │                      │  ◄──────────────── invoice URL ───┤
      │                      │
      │  redirected to       │
      │  payment page ──────►│  customer pays QRIS / VA / wallet via Xendit
      │                      │
      │                      │  webhook ◄─────────────────────  Xendit (PAID)
      │                      │  funds → escrow (held)
      │                      │  Beckn /status  ─────────────►   notifies BPP
      │                      │                                   │  notifies seller
      │  /chat ping ◄────────│                                   │
      │
      │           ──────────────────  package travels  ─────────────────────►
      │                                                                  │
      │  "I got my package" ►  /api/v1/orders/{id}/confirm-delivered      │
      │                      │  funds RELEASE → seller bank acct          │
      │                      │  Beckn /update (delivered) ────────►       │
      │                                                                  │
      │  or D+3 timer in ────  apps/beli-aman-bap/services/release_clock
      │  apps/beli-aman-bap   auto-releases if no dispute filed
```

Dispute flow uses ONDC IGM (Issue & Grievance Management) — sees
`packages/network-extension/enums/igm` for codes. Customer files via
`<DisputeButton>` in the SDK or via the BAP's REST endpoint.

## Theming

The SDK ships unstyled CSS variables (`./styles.css`). Host storefronts
override:

```css
.beli-aman-sdk {
  --beli-aman-primary: #6B2C1A;        /* Safiya brown */
  --beli-aman-primary-fg: #FBF6EC;
  --beli-aman-bg: #FBF6EC;
  --beli-aman-surface: #FFFFFF;
  --beli-aman-text: #2A1810;
  --beli-aman-text-muted: #7A6856;
  --beli-aman-radius: 14px;
}
```

All components use these vars. WCAG AA via the picked palette is on
the consumer to verify — we surface contrast violations only via
warnings, not enforcement.

## Build + publish

```bash
pnpm install
pnpm changeset           # describe your change
pnpm test
pnpm build
# Merge to main → changesets action opens Version PR → merge that → publishes to npm
```

## Compatibility

| Surface | Versions |
|---|---|
| React | 18+ |
| Next.js | 14+ |
| Node (server-side `lib/api`) | 20+ |
| BAP | any [`@jaringan-dagang/beckn-protocol`](https://www.npmjs.com/package/@jaringan-dagang/beckn-protocol)-compatible BAP — reference impl is [`MetatechID/jaringan-dagang-protocol/apps/beli-aman-bap`](https://github.com/MetatechID/jaringan-dagang-protocol/tree/main/apps/beli-aman-bap) |
| Beckn core_version | 1.1.0 (pinned via the protocol package) |
