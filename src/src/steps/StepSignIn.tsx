"use client";

import { useState } from "react";

import { useBeliAman } from "../BeliAmanProvider";
import { signInWithGoogle } from "../lib/firebase";
import { t } from "../lib/i18n";

export function StepSignIn() {
  const { brandTheme, apiOpts, startSignIn, signedIn } = useBeliAman();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // If already signed in (e.g. resumed flow), the provider will have advanced
  // to cart-review automatically; this is a safety fallback.
  if (signedIn) {
    return (
      <div className="ba-step ba-step-signin">
        <p>{t.step.signInBlurb}</p>
        <button className="ba-btn-primary" onClick={() => startSignIn()}>
          {t.cta.continueToReview}
        </button>
      </div>
    );
  }

  const handleSignIn = async () => {
    setBusy(true);
    setErr(null);
    try {
      await signInWithGoogle(apiOpts.firebase);
      // After Firebase user is set, exchange with BAP & advance to cart-review.
      await startSignIn();
    } catch (e: any) {
      if (e?.message === "REDIRECT_IN_PROGRESS") {
        // Page is navigating away; nothing to do.
        return;
      }
      // Show the real Firebase error so debugging is possible in production.
      const code = e?.code ? `[${e.code}] ` : "";
      const msg = e?.message || String(e);
      setErr(`${t.error.signInFailed} ${code}${msg}`);
      setBusy(false);
    }
  };

  return (
    <div className="ba-step ba-step-signin">
      <div className="ba-signin-hero">
        <div className="ba-signin-shield" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
            <path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Zm-1 14-3.5-3.5 1.4-1.4L11 13.2l4.1-4.1 1.4 1.4L11 16Z" />
          </svg>
        </div>
        <h2 className="ba-h2">{t.step.signInTitle}</h2>
        <p className="ba-muted">{t.step.signInBlurb}</p>
      </div>

      <button
        className="ba-btn-google"
        onClick={handleSignIn}
        disabled={busy}
        type="button"
      >
        <span className="ba-google-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.55 5.55 0 0 1-2.4 3.64v3.02h3.86c2.27-2.09 3.56-5.17 3.56-8.9Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3.02a7.34 7.34 0 0 1-4.07 1.15c-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.27 14.26a7.2 7.2 0 0 1 0-4.52V6.63H1.27a12 12 0 0 0 0 10.74l4-3.11Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.78a6.5 6.5 0 0 1 4.6 1.8l3.43-3.43A11.55 11.55 0 0 0 12 0 12 12 0 0 0 1.27 6.63l4 3.11A7.13 7.13 0 0 1 12 4.78Z"
            />
          </svg>
        </span>
        <span>{busy ? "Memproses..." : t.cta.continueWithGoogle}</span>
      </button>

      {err ? <p className="ba-error-inline">{err}</p> : null}

      <p className="ba-fineprint">
        Dengan masuk, Anda menyetujui{" "}
        <a href="#" className="ba-link">
          Ketentuan
        </a>{" "}
        dan{" "}
        <a href="#" className="ba-link">
          Kebijakan Privasi
        </a>{" "}
        Beli Aman.
      </p>

      <div className="ba-trust-pills">
        <span className="ba-pill">🛡️ Escrow oleh Beli Aman</span>
        <span className="ba-pill">🔒 Aman & terenkripsi</span>
      </div>
    </div>
  );
}
