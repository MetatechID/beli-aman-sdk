---
"@beli-aman/sdk": minor
---

feat: passwordless login via WhatsApp + email (in addition to Google SSO)

`<StepSignIn>` now renders a method picker (Google / WhatsApp / Email). The
WA and email paths request a 6-digit OTP from the BAP's new
`/api/v1/auth/otp/{request,verify}` endpoints; on successful verify the BAP
returns a Firebase custom token which the SDK consumes via
`signInWithCustomToken`. Downstream Firebase ID-token plumbing is unchanged.

New public surface:

- `api.requestOtp(bapUrl, { channel, contact })`
- `api.verifyOtp(bapUrl, { channel, contact, code })`
- `signInWithCustomToken(firebaseConfig, customToken)` (re-exported from `lib/firebase`)

Storefronts that integrate `<BeliAmanProvider>` without overriding
`<StepSignIn>` get the new methods automatically.
