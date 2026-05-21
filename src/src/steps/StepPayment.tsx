"use client";

import { useEffect, useRef, useState } from "react";

import { useBeliAman } from "../BeliAmanProvider";
import { formatIDR, t } from "../lib/i18n";

const POLL_INTERVAL_MS = 4000;

export function StepPayment() {
  const { order, invoice, refreshOrder, goTo } = useBeliAman();
  const total = order?.total_idr ?? 0;
  const invoiceUrl = invoice?.invoice_url;
  const expiresAt = invoice?.expires_at;

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

  // Poll the order's state until the Xendit webhook flips it to ESCROW_HELD.
  const pollingRef = useRef(false);
  useEffect(() => {
    if (!invoiceUrl || pollingRef.current) return;
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
  }, [invoiceUrl, refreshOrder, goTo]);

  if (!invoiceUrl) {
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

      <div className="ba-xendit-frame-wrap">
        <iframe
          className="ba-xendit-frame"
          src={invoiceUrl}
          title="Beli Aman × Xendit"
          allow="payment"
        />
      </div>

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

      <p className="ba-fineprint ba-center">
        🛡️ Dana ditahan oleh Beli Aman sampai Anda menerima barang.
      </p>
      <p className="ba-fineprint ba-center ba-muted">
        Status pembayaran diperiksa otomatis setiap beberapa detik.
      </p>
    </div>
  );
}
