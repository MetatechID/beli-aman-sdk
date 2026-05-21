"use client";

import { t } from "../lib/i18n";

export function StepProcessing() {
  return (
    <div className="ba-step ba-step-processing">
      <div className="ba-spinner" aria-hidden="true" />
      <h2 className="ba-h2">{t.step.processingTitle}</h2>
      <p className="ba-muted">Menahan dana di escrow Beli Aman...</p>
    </div>
  );
}
