"use client";

// Classic JSX transform (vitest/esbuild has no automatic runtime) — React
// must be in scope for the JSX below. Next.js consumers are unaffected.
import React from "react";
import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

import { useBeliAman } from "../BeliAmanProvider";
import { formatIDR, t } from "../lib/i18n";
import { isQrisInvoice } from "../lib/payments";

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
          <QRCodeSVG value={qrContent} size={220} />
        ) : (
          <img
            src={qrImageUrl ?? ""}
            alt="QRIS"
            className="ba-qr-img"
            style={{ width: 220, height: 220 }}
          />
        )}
        <span className="ba-qr-label">QRIS</span>
      </div>
      <p className="ba-muted ba-center" style={{ margin: 0 }}>
        {t.payment.qrisInstruction}
      </p>
    </div>
  );
}

export function StepPayment() {
  const { order, invoice, refreshOrder, goTo } = useBeliAman();
  const total = order?.total_idr ?? 0;
  const invoiceUrl = invoice?.invoice_url;
  const expiresAt = invoice?.expires_at;
  const qrContent = invoice?.qr_content;
  const qrImageUrl = invoice?.qr_image_url;
  const hasQr = isQrisInvoice(invoice);

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
  const hasPaymentTarget = Boolean(invoiceUrl || qrImageUrl || qrContent);
  useEffect(() => {
    if (!hasPaymentTarget || pollingRef.current) return;
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
  }, [hasPaymentTarget, invoiceUrl, qrImageUrl, qrContent, refreshOrder, goTo]);

  // No hosted page AND no QR → nothing to render yet (invoice still being
  // minted server-side).
  if (!hasPaymentTarget) {
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
          <span className="ba-xendit-logo">⬣ Beli Aman × Xendit</span>
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

      {hasQr ? (
        <QrisCard qrContent={qrContent} qrImageUrl={qrImageUrl} />
      ) : (
        <div className="ba-xendit-frame-wrap">
          <iframe
            className="ba-xendit-frame"
            src={invoiceUrl}
            title="Beli Aman × Xendit"
            allow="payment"
          />
        </div>
      )}

      {invoiceUrl ? (
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
