# @jaringan-dagang/beli-aman-sdk

## 0.2.0

### Minor Changes

- 89df49d: Add **Dipay** as a payment provider with inline QRIS checkout.

  - `PaymentProvider` union gains `"dipay"` (`PROVIDER_LABEL.dipay = "Dipay"`, `PROVIDER_METHODS.dipay` = single QRIS category).
  - `BeliAmanButton` now passes the provider into the canonical provider context; payment titles, cart method labels, confirmation copy, payment branding, iframe titles, and refresh restoration remain provider-aware.
  - Invoices carrying either current BAP `qris_content` / `qris_image_url` fields or legacy `qr_content` / `qr_image_url` fields render an inline QRIS card via exported `QrisCard`, while hosted checkout actions remain available for non-QR providers only.
  - Malformed QR invoices render an explicit accessible fallback and never emit an empty image source; QR PNG URLs are not presented as generic hosted-checkout links.
  - Adds `qrcode.react ^4.2.0` as the first runtime dependency (bundled by tsup — intentionally not in `externals`).
  - Polling and provider/invoice restoration support payment flows resumed from session storage.

## 0.1.0

### Minor Changes

- 6dee418: feat: passwordless login via WhatsApp + email (in addition to Google SSO)

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
