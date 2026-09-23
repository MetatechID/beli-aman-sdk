// Unit tests for the Dipay QRIS support:
//   1. payments.ts registers the dipay provider (1 category, correct label).
//   2. isQrisInvoice detects invoices carrying QR payload / QR image.
//   3. The exported QrisCard component renders the QR branch (SVG for
//      qr_content, <img> for qr_image_url) plus the buyer instruction copy.
//
// QrisCard is rendered with react-dom/server so no provider context is
// needed — the component is intentionally context-free.
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
// Classic JSX transform (no automatic runtime configured) — React must be
// in scope for the <QrisCard /> literals below.
import React from "react";

import {
  PROVIDER_LABEL,
  PROVIDER_METHODS,
  _selfCheck,
  getQrisPayment,
  isQrisInvoice,
  type PaymentProvider,
} from "../../src/src/lib/payments";
import { titleForStep } from "../../src/src/BeliAmanProvider";
import { QrisCard } from "../../src/src/steps/StepPayment";

const FAKE_QRIS = "00020101021126610014COM.GO-JEK.WWW0118936009143012345678";

describe("payments.ts dipay provider", () => {
  it("registers dipay with exactly 1 category (QRIS)", () => {
    expect(PROVIDER_LABEL.dipay).toBe("Dipay");
    expect(PROVIDER_METHODS.dipay).toHaveLength(1);
    expect(PROVIDER_METHODS.dipay[0].key).toBe("QRIS");
    expect(PROVIDER_METHODS.dipay[0].label).toBe("QRIS");
    expect(PROVIDER_METHODS.dipay[0].icon).toBeTruthy();
  });

  it("keeps the other providers unchanged", () => {
    const counts: Record<PaymentProvider, number> = {
      oy: PROVIDER_METHODS.oy.length,
      sento: PROVIDER_METHODS.sento.length,
      xendit: PROVIDER_METHODS.xendit.length,
      dipay: PROVIDER_METHODS.dipay.length,
    };
    expect(counts).toEqual({ oy: 4, sento: 3, xendit: 5, dipay: 1 });
  });

  it("passes the development self-check", () => {
    expect(() => _selfCheck()).not.toThrow();
  });
});

describe("QRIS invoice normalization", () => {
  it("accepts canonical BAP qris_* fields and legacy qr_* aliases", () => {
    expect(getQrisPayment({ qris_content: FAKE_QRIS, qris_image_url: " https://cdn.example/qr.png " })).toEqual({
      content: FAKE_QRIS,
      imageUrl: "https://cdn.example/qr.png",
    });
    expect(getQrisPayment({ qr_content: FAKE_QRIS, qr_image_url: "https://legacy.example/qr.png" })).toEqual({
      content: FAKE_QRIS,
      imageUrl: "https://legacy.example/qr.png",
    });
  });

  it("ignores blank QR fields", () => {
    expect(getQrisPayment({ qris_content: " ", qr_content: "", qris_image_url: null })).toEqual({
      content: null,
      imageUrl: null,
    });
  });
});

describe("provider-aware payment copy", () => {
  it("includes the selected provider in payment titles", () => {
    expect(titleForStep("payment", "dipay")).toBe("Bayar via Dipay");
    expect(titleForStep("payment", "oy")).toBe("Bayar via OY Indonesia");
    expect(titleForStep("payment", null)).toBe("Bayar via Xendit");
  });
});

describe("isQrisInvoice", () => {
  it("is false for null/undefined/plain hosted-checkout invoices", () => {
    expect(isQrisInvoice(null)).toBe(false);
    expect(isQrisInvoice(undefined)).toBe(false);
    expect(isQrisInvoice({ invoice_url: "https://pay.example.com/inv" })).toBe(false);
    expect(isQrisInvoice({ qr_content: null, qr_image_url: null })).toBe(false);
  });

  it("is true for canonical or legacy QR content and images", () => {
    expect(isQrisInvoice({ qris_content: FAKE_QRIS })).toBe(true);
    expect(isQrisInvoice({ qris_image_url: "https://cdn.example.com/qr.png" })).toBe(true);
    expect(isQrisInvoice({ qr_content: FAKE_QRIS })).toBe(true);
    expect(isQrisInvoice({ qr_image_url: "https://legacy.example.com/qr.png" })).toBe(true);
    expect(isQrisInvoice({ qr_content: FAKE_QRIS, qr_image_url: null })).toBe(true);
    // Empty and whitespace-only strings don't count as QR content.
    expect(isQrisInvoice({ qr_content: "", qris_content: " " })).toBe(false);
  });
});

describe("QrisCard", () => {
  it("renders an accessible inline SVG QR when QRIS content is present", () => {
    const html = renderToStaticMarkup(<QrisCard qrContent={FAKE_QRIS} />);
    expect(html).toContain("<svg");
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Kode QRIS untuk pembayaran"');
    expect(html).toContain('class="ba-qr-card"');
    expect(html).toContain('class="ba-qr-label"');
    expect(html).toContain("QRIS");
    // Buyer-facing instruction copy.
    expect(html).toContain("Scan dengan aplikasi pembayaran");
  });

  it("falls back to the hosted QR image when only qr_image_url is present", () => {
    const html = renderToStaticMarkup(
      <QrisCard qrContent={null} qrImageUrl="https://cdn.example.com/qr.png" />,
    );
    expect(html).not.toContain("<svg");
    expect(html).toContain('src="https://cdn.example.com/qr.png"');
    expect(html).toContain('alt="Kode QRIS untuk pembayaran"');
    expect(html).toContain('width="220"');
    expect(html).toContain('height="220"');
    expect(html).toContain("ba-qr-img");
  });

  it("renders a safe explicit fallback instead of an empty image source", () => {
    const html = renderToStaticMarkup(<QrisCard qrContent={null} qrImageUrl={null} />);
    expect(html).not.toContain("<img");
    expect(html).not.toContain('src=""');
    expect(html).toContain('role="alert"');
    expect(html).toContain("Kode QRIS tidak tersedia");
  });
});
