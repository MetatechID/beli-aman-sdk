---
"@jaringan-dagang/beli-aman-sdk": minor
---

Add **Dipay** as a payment provider with inline QRIS checkout.

- `PaymentProvider` union gains `"dipay"` (`PROVIDER_LABEL.dipay = "Dipay"`, `PROVIDER_METHODS.dipay` = single QRIS category).
- Invoices that carry `qr_content` (raw QRIS payload) or `qr_image_url` (hosted QR image) now render a scannable QRIS card in the payment step via a new exported `QrisCard` component, instead of the gateway iframe. The iframe path for Xendit/OY/Sento is unchanged.
- `InvoiceResponse` gains optional `qr_content` / `qr_image_url`; the session-restore path maps them from the order's `payment_method_snapshot` so a mid-payment refresh keeps showing the QR.
- Adds `qrcode.react ^4.2.0` as the first runtime dependency (bundled by tsup — intentionally not in `externals`).
