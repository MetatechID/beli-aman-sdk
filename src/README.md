# @jaringan-dagang/beli-aman-sdk

The drop-in checkout button + buyer-protection flow for Beli Aman.

This is the React SDK that any partner brand site embeds. It renders the
**"Bayar Aman"** CTA, opens a modal/bottom-sheet on click, walks the buyer
through Google sign-in → cart review → confirm → Xendit-style payment →
done, and talks to the Beli Aman BAP backend behind the scenes.

## Usage

```tsx
import {
  BeliAmanProvider,
  BeliAmanButton,
} from "@jaringan-dagang/beli-aman-sdk";
import "@jaringan-dagang/beli-aman-sdk/styles.css";

import { antarestar } from "@/lib/brands/antarestar";

export default function Layout({ children }) {
  return (
    <BeliAmanProvider
      config={{
        bapUrl: process.env.NEXT_PUBLIC_BAP_URL!,
        firebase: {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
        },
        brand: antarestar,
      }}
    >
      {children}
    </BeliAmanProvider>
  );
}

// On any product page, in your CTA row:
<BeliAmanButton
  brandSlug="antarestar"
  items={[{ sku: "ANT-VLM-CRINKLE-NAVY-L", qty: 1 }]}
/>
```

## State machine

The flow is `sign-in → cart-review → confirm → payment → processing → done`.
Each step persists to `sessionStorage` so a refresh resumes where the user
left off.

## v2 plans

- Build a CDN-bundled UMD/IIFE version so non-React partner sites can embed
  via `<script>` tag.
- Replace the mock `StepPayment` with a real Xendit `invoice_url` iframe.
