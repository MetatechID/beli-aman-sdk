"use client";

import { useState } from "react";

import { useBeliAman } from "../BeliAmanProvider";
import { formatIDR, t } from "../lib/i18n";

export function StepDone() {
  const { order, close, resetFlow, confirmReceipt } = useBeliAman();
  const [confirming, setConfirming] = useState(false);

  const orderId = order?.id;
  const total = order?.total_idr ?? 0;
  const state = order?.state;
  const canConfirmReceipt = state === "FULFILLING" || state === "RECEIVED";

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await confirmReceipt();
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="ba-step ba-step-done">
      <div className="ba-done-check" aria-hidden="true">
        <svg viewBox="0 0 64 64" width="80" height="80">
          <circle cx="32" cy="32" r="30" fill="#DCFCE7" stroke="#16A34A" strokeWidth="3" />
          <path d="M18 32l9 9 19-21" fill="none" stroke="#16A34A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="ba-h2 ba-center">{t.step.doneTitle}</h2>
      <p className="ba-muted ba-center">{t.step.doneBlurb}</p>

      <div className="ba-done-summary">
        <div className="ba-row">
          <span>Total dibayar</span>
          <strong>{formatIDR(total)}</strong>
        </div>
        <div className="ba-row">
          <span>ID Pesanan</span>
          <strong className="ba-mono">{orderId?.slice(0, 8) || "—"}</strong>
        </div>
        {state ? (
          <div className="ba-row">
            <span>Status</span>
            <strong className="ba-mono">{state}</strong>
          </div>
        ) : null}
      </div>

      {canConfirmReceipt ? (
        <button
          className="ba-btn-primary ba-cta-fw"
          onClick={handleConfirm}
          disabled={confirming}
        >
          {confirming ? "Memproses..." : "Saya sudah terima paket"}
        </button>
      ) : null}

      {orderId ? (
        <a
          className={canConfirmReceipt ? "ba-btn-secondary ba-cta-fw" : "ba-btn-primary ba-cta-fw"}
          href={`/orders/${orderId}`}
          onClick={() => resetFlow()}
        >
          {t.cta.viewOrder}
        </a>
      ) : null}

      <button className="ba-btn-secondary ba-cta-fw" onClick={() => { resetFlow(); close(); }}>
        {t.cta.backToShop}
      </button>
    </div>
  );
}
