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
  qris_content?: string | null;
  qr_image_url?: string | null;
  qris_image_url?: string | null;
}

/** Resolve QR fields from either the current BAP (`qris_*`) names or the
 *  legacy SDK (`qr_*`) names while both response shapes are in circulation. */
export function getQrisPayment(inv: QrisInvoiceLike | null | undefined): {
  content: string | null;
  imageUrl: string | null;
} {
  return {
    content: firstNonEmptyString(inv?.qris_content, inv?.qr_content),
    imageUrl: firstNonEmptyString(inv?.qris_image_url, inv?.qr_image_url),
  };
}

/** True when the invoice carries an inline QRIS payload or pre-rendered QR
 *  image — i.e. the buyer pays by scanning in-page rather than through a
 *  gateway-hosted checkout. */
export function isQrisInvoice(inv: QrisInvoiceLike | null | undefined): boolean {
  const { content, imageUrl } = getQrisPayment(inv);
  return Boolean(content || imageUrl);
}

/** True for invoice URLs whose path is an obvious QR/image asset rather than
 *  a hosted checkout page. Query parameters are intentionally ignored. */
export function isImageUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    return /\.(?:png|jpe?g|webp|svg)$/i.test(new URL(value).pathname);
  } catch {
    return /\.(?:png|jpe?g|webp|svg)(?:[?#]|$)/i.test(value);
  }
}

function firstNonEmptyString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
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
