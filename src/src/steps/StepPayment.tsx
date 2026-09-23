"use client";

// Classic JSX transform (vitest/esbuild has no automatic runtime) — React
// must be in scope for the JSX below. Next.js consumers are unaffected.
import React from "react";
import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

import { useBeliAman } from "../BeliAmanProvider";
import { defaultProvider, formatIDR, t } from "../lib/i18n";
import { getQrisPayment, isImageUrl, isQrisInvoice } from "../lib/payments";

const POLL_INTERVAL_MS = 4000;

/** Inline QRIS card — rendered instead of the gateway iframe when the
 *  invoice carries a QR payload (qr_content) or a hosted QR image
 *  (qr_image_url), e.g. for the Dipay provider. Exported so unit tests can
 *  render it in isolation. */
export function QrisCard({
  qrContent,
  qrImageUrl,
}: {
  qrContent?: string | null;
  qrImageUrl?: string | null;
}) {
  return (
    <div className="ba-qr-card">
      <div className="ba-qr-wrap">
        {qrContent ? (
          <QRCodeSVG
            value={qrContent}
            size={220}
            role="img"
            aria-label={t.payment.qrisImageAlt}
          />
        ) : qrImageUrl ? (
          <img
            src={qrImageUrl}
            alt={t.payment.qrisImageAlt}
            className="ba-qr-img"
            width={220}
            height={220}
          />
        ) : (
          <p className="ba-error-inline ba-center" role="alert">
            {t.payment.qrisUnavailable}
          </p>
        )}
        {qrContent || qrImageUrl ? <span className="ba-qr-label">QRIS</span> : null}
      </div>
      <p className="ba-muted ba-center" style={{ margin: 0 }}>
        {t.payment.qrisInstruction}
      </p>
    </div>
  );
}

export function StepPayment() {
  const { order, invoice, refreshOrder, goTo, paymentProvider } = useBeliAman();
  const total = order?.total_idr ?? 0;
  const invoiceUrl = invoice?.invoice_url?.trim() || null;
  const expiresAt = invoice?.expires_at;
  const normalizedQris = getQrisPayment(invoice);
  const invoiceUrlIsImage = isImageUrl(invoiceUrl);
  const qrContent = normalizedQris.content;
  const qrImageUrl = normalizedQris.imageUrl ?? (invoiceUrlIsImage ? invoiceUrl : null);
  const hasQr = isQrisInvoice(invoice) || invoiceUrlIsImage;
  const isQrisProvider = paymentProvider === "dipay";
  // Dipay's signed development mock is a real hosted checkout page and carries
  // no qris_* fields. Keep that URL usable, but never treat an obvious image
  // asset (including a PNG supplied only as invoice_url) as hosted checkout.
  const shouldRenderQris = hasQr || (isQrisProvider && !invoiceUrl);

  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!expiresAt) return;
    const target = new Date(expiresAt).getTime();
    const id = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.floor((target - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const timer = (() => {
    if (secondsLeft === null) return null;
    const h = Math.floor(secondsLeft / 3600);
    const m = Math.floor((secondsLeft % 3600) / 60);
    const s = secondsLeft % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  })();

  // Poll the order's state until the gateway webhook flips it to ESCROW_HELD.
  // Runs whenever there is anything to pay against: a hosted-checkout URL
  // (Xendit/OY/Sento) or an inline QRIS payload/image (Dipay).
  const pollingRef = useRef(false);
  const hasInvoice = Boolean(invoice);
  useEffect(() => {
    if (!hasInvoice || pollingRef.current) return;
    pollingRef.current = true;
    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      const fresh = await refreshOrder();
      if (stopped) return;
      if (fresh && fresh.state === "ESCROW_HELD") {
        goTo("done");
        return;
      }
      setTimeout(tick, POLL_INTERVAL_MS);
    };
    setTimeout(tick, POLL_INTERVAL_MS);
    return () => {
      stopped = true;
      pollingRef.current = false;
    };
  }, [hasInvoice, refreshOrder, goTo]);

  // No invoice object yet means the server is still minting the payment.
  // A present but malformed invoice is handled explicitly below.
  if (!invoice) {
    return (
      <div className="ba-step ba-step-payment">
        <p className="ba-muted ba-center">Menyiapkan halaman pembayaran...</p>
      </div>
    );
  }

  return (
    <div className="ba-step ba-step-payment">
      <div className="ba-xendit-bar">
        <div className="ba-xendit-bar-left">
          <span className="ba-xendit-logo">{t.payment.brandLine(defaultProvider(paymentProvider))}</span>
          {timer ? (
            <>
              <span className="ba-muted">{t.field.expiresIn}</span>
              <span className="ba-timer">{timer}</span>
            </>
          ) : null}
        </div>
        <div className="ba-xendit-bar-right">
          <span className="ba-muted">Total</span>
          <strong className="ba-xendit-amount">{formatIDR(total)}</strong>
        </div>
      </div>

      {shouldRenderQris ? (
        <QrisCard qrContent={qrContent} qrImageUrl={qrImageUrl} />
      ) : invoiceUrl ? (
        <div className="ba-xendit-frame-wrap">
          <iframe
            className="ba-xendit-frame"
            src={invoiceUrl}
            title={t.payment.iframeTitle(defaultProvider(paymentProvider))}
            allow="payment"
          />
        </div>
      ) : (
        <div className="ba-error-inline ba-center" role="alert">
          {t.payment.invoiceUnavailable}
        </div>
      )}

      {invoiceUrl && !shouldRenderQris ? (
        <div className="ba-pay-actions">
          <a
            className="ba-btn-secondary ba-cta-fw"
            href={invoiceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Buka di tab baru
          </a>
        </div>
      ) : null}

      <p className="ba-fineprint ba-center">
        🛡️ Dana ditahan oleh Beli Aman sampai Anda menerima barang.
      </p>
      <p className="ba-fineprint ba-center ba-muted">
        Status pembayaran diperiksa otomatis setiap beberapa detik.
      </p>
    </div>
  );
}
