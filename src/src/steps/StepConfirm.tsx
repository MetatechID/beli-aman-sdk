"use client";

import { useState } from "react";

import { useBeliAman } from "../BeliAmanProvider";
import { formatIDR, t } from "../lib/i18n";

export function StepConfirm() {
  const { order, proceedToPayment } = useBeliAman();
  const [busy, setBusy] = useState(false);

  const total = order?.total_idr ?? 0;

  const handleProceed = async () => {
    setBusy(true);
    try {
      await proceedToPayment();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ba-step ba-step-confirm">
      <div className="ba-confirm-amount">
        <div className="ba-muted ba-confirm-amount-label">Total yang akan dibayar</div>
        <div className="ba-confirm-amount-value">{formatIDR(total)}</div>
      </div>

      <section className="ba-explainer">
        <h3 className="ba-h3 ba-explainer-title">{t.escrow.explainerTitle}</h3>
        <ol className="ba-explainer-steps">
          <li>
            <span className="ba-explainer-icon">🛡️</span>
            <div>
              <strong>{t.escrow.held}</strong>
              <p className="ba-muted">{t.escrow.heldBlurb}</p>
            </div>
          </li>
          <li>
            <span className="ba-explainer-icon">📦</span>
            <div>
              <strong>{t.escrow.received}</strong>
              <p className="ba-muted">{t.escrow.receivedBlurb}</p>
            </div>
          </li>
          <li>
            <span className="ba-explainer-icon">💸</span>
            <div>
              <strong>{t.escrow.released}</strong>
              <p className="ba-muted">{t.escrow.releasedBlurb}</p>
            </div>
          </li>
        </ol>
      </section>

      <button className="ba-btn-primary ba-cta-fw" onClick={handleProceed} disabled={busy}>
        {busy ? "Memproses..." : t.cta.payNow}
      </button>

      <p className="ba-fineprint ba-center">
        Pembayaran diproses oleh Xendit dan ditahan di escrow Beli Aman.
      </p>
    </div>
  );
}
