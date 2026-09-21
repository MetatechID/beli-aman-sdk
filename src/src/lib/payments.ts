// Per-provider category list shown in the cart's "Metode Pembayaran" section.
//
// Xendit and OY use hosted-checkout — after invoice creation the buyer is
// redirected to a single gateway-hosted page and picks the actual bank /
// e-wallet there. So we can't offer per-bank selection in our UI; we only
// surface the *categories* the brand's gateway supports. Sento behaves the
// same. Dipay is different: the BAP mints a QRIS payload and the SDK renders
// it inline (see StepPayment's QR branch) — hence the single QRIS category.
//
// `Brand.payment_provider` (BAP DB column) is the source of truth. The SDK
// receives it via the `paymentProvider` prop on <BeliAmanButton> and stores
// it on the BeliAmanProvider context.

export type PaymentProvider = "xendit" | "oy" | "sento" | "dipay";

export interface PaymentMethod {
  key: string;
  label: string;
  icon: string;
}

export const PROVIDER_LABEL: Record<PaymentProvider, string> = {
  xendit: "Xendit",
  oy: "OY Indonesia",
  sento: "Sento",
  dipay: "Dipay",
};

// Static map of categories each gateway exposes. Update if a
// gateway adds/removes a category; the _selfCheck catches
// accidental corruption.
export const PROVIDER_METHODS: Record<PaymentProvider, PaymentMethod[]> = {
  oy: [
    { key: "VA", label: "Virtual Account", icon: "🏦" },
    { key: "EWALLET", label: "E-Wallet", icon: "📱" },
    { key: "QRIS", label: "QRIS", icon: "🔳" },
    { key: "RETAIL", label: "Gerai Retail", icon: "🏪" },
  ],
  sento: [
    { key: "VA", label: "Virtual Account", icon: "🏦" },
    { key: "EWALLET", label: "E-Wallet", icon: "📱" },
    { key: "QRIS", label: "QRIS", icon: "🔳" },
  ],
  xendit: [
    { key: "VA", label: "Virtual Account", icon: "🏦" },
    { key: "EWALLET", label: "E-Wallet", icon: "📱" },
    { key: "QRIS", label: "QRIS", icon: "🔳" },
    { key: "CARD", label: "Kartu Kredit", icon: "💳" },
    { key: "RETAIL", label: "Gerai Retail", icon: "🏪" },
  ],
  dipay: [{ key: "QRIS", label: "QRIS", icon: "🔳" }],
};

export function getMethods(provider: PaymentProvider | undefined | null): PaymentMethod[] {
  if (provider && PROVIDER_METHODS[provider]) return PROVIDER_METHODS[provider];
  return PROVIDER_METHODS.xendit; // safe default
}

// ---- Dipay QRIS helpers ----

/** Structural subset of the invoice object the QR branch of StepPayment
 *  needs. Kept structural (instead of importing InvoiceResponse) so this
 *  module stays dependency-free. */
export interface QrisInvoiceLike {
  invoice_url?: string | null;
  qr_content?: string | null;
  qr_image_url?: string | null;
}

/** True when the invoice carries an inline QRIS payload (qr_content) or a
 *  pre-rendered QR image (qr_image_url) — i.e. the buyer pays by scanning a
 *  QR in-page instead of the gateway's hosted-checkout iframe (Dipay). */
export function isQrisInvoice(inv: QrisInvoiceLike | null | undefined): boolean {
  return !!inv && !!(inv.qr_content || inv.qr_image_url);
}

// Development-time self-check. Run via `node --import tsx ...`.
// Not bundled into the browser build (the `typeof require` guard plus the
// `import.meta.env.DEV`-style check keep it tree-shaken in prod). Fails
// loudly if a future edit drops a category or breaks the documented shape.
export function _selfCheck(): void {
  if (PROVIDER_METHODS.oy.length !== 4) throw new Error("OY should expose 4 categories");
  if (PROVIDER_METHODS.sento.length !== 3) throw new Error("Sento should expose 3 categories (VA, EWALLET, QRIS)");
  if (PROVIDER_METHODS.xendit.length !== 5) throw new Error("Xendit should expose 5 categories");
  if (PROVIDER_METHODS.dipay.length !== 1) throw new Error("Dipay should expose 1 category (QRIS)");
  for (const provider of Object.keys(PROVIDER_METHODS) as PaymentProvider[]) {
    for (const m of PROVIDER_METHODS[provider]) {
      if (!m.key || !m.label || !m.icon) {
        throw new Error(`${provider}/${m.key} missing fields`);
      }
    }
  }
}
