"use client";

import { useEffect, useRef, useState } from "react";

import { useBeliAman } from "../BeliAmanProvider";
import { api } from "../lib/api";
import { signInWithCustomToken, signInWithGoogle } from "../lib/firebase";
import { t } from "../lib/i18n";

type Method = "picker" | "google" | "wa" | "email";
type SubStep = "contact" | "code";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Loose phone validation: 8-15 digits after stripping non-digits. The BAP's
 *  /otp/request does the real normalization to E.164 → we just gate the
 *  send button so users don't fat-finger it. */
function looksLikeIdPhone(input: string): boolean {
  const digits = input.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

export function StepSignIn() {
  const { apiOpts, startSignIn, signedIn } = useBeliAman();

  const [method, setMethod] = useState<Method>("picker");
  const [sub, setSub] = useState<SubStep>("contact");
  const [contact, setContact] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Reset code field when switching method.
  useEffect(() => {
    setSub("contact");
    setCode("");
    setErr(null);
  }, [method]);

  // Already signed in (resumed flow) — let the provider advance us forward.
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

  // ----- Google -----
  const handleGoogle = async () => {
    setBusy(true);
    setErr(null);
    try {
      await signInWithGoogle(apiOpts.firebase);
      await startSignIn();
    } catch (e: any) {
      if (e?.message === "REDIRECT_IN_PROGRESS") return;
      const errCode = e?.code ? `[${e.code}] ` : "";
      setErr(`${t.error.signInFailed} ${errCode}${e?.message || String(e)}`);
      setBusy(false);
    }
  };

  // ----- OTP request -----
  const handleRequest = async () => {
    setErr(null);
    if (method === "wa" && !looksLikeIdPhone(contact)) {
      setErr(t.error.invalidPhone);
      return;
    }
    if (method === "email" && !EMAIL_RE.test(contact.trim())) {
      setErr(t.error.invalidEmail);
      return;
    }
    setBusy(true);
    try {
      await api.requestOtp(apiOpts.bapUrl, {
        channel: method === "wa" ? "wa" : "email",
        contact: contact.trim(),
      });
      setSub("code");
    } catch (e: any) {
      setErr(`${t.error.networkFailed} ${e?.message || ""}`);
    } finally {
      setBusy(false);
    }
  };

  // ----- OTP verify -----
  const handleVerify = async () => {
    setErr(null);
    if (!/^\d{6}$/.test(code)) {
      setErr(t.error.invalidCode);
      return;
    }
    setBusy(true);
    try {
      const r = await api.verifyOtp(apiOpts.bapUrl, {
        channel: method === "wa" ? "wa" : "email",
        contact: contact.trim(),
        code,
      });
      await signInWithCustomToken(apiOpts.firebase, r.custom_token);
      // Materialize the profile server-side (existing /auth/exchange path).
      await startSignIn();
    } catch (e: any) {
      if (e?.status === 400) {
        setErr(t.error.invalidCode);
      } else {
        setErr(`${t.error.signInFailed} ${e?.message || String(e)}`);
      }
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

      {method === "picker" ? (
        <MethodPicker
          busy={busy}
          onGoogle={handleGoogle}
          onWa={() => setMethod("wa")}
          onEmail={() => setMethod("email")}
        />
      ) : (
        <OtpForm
          method={method as "wa" | "email"}
          sub={sub}
          contact={contact}
          code={code}
          busy={busy}
          onContactChange={setContact}
          onCodeChange={setCode}
          onRequest={handleRequest}
          onVerify={handleVerify}
          onBack={() => setMethod("picker")}
          onChangeContact={() => setSub("contact")}
        />
      )}

      {err ? <p className="ba-error-inline">{err}</p> : null}

      <p className="ba-fineprint">
        Dengan masuk, Anda menyetujui{" "}
        <a href="#" className="ba-link">Ketentuan</a>{" "}dan{" "}
        <a href="#" className="ba-link">Kebijakan Privasi</a>{" "}Beli Aman.
      </p>

      <div className="ba-trust-pills">
        <span className="ba-pill">🛡️ Escrow oleh Beli Aman</span>
        <span className="ba-pill">🔒 Aman & terenkripsi</span>
      </div>
    </div>
  );
}

function MethodPicker({
  busy,
  onGoogle,
  onWa,
  onEmail,
}: {
  busy: boolean;
  onGoogle: () => void;
  onWa: () => void;
  onEmail: () => void;
}) {
  return (
    <div className="ba-signin-methods">
      <button
        className="ba-btn-google"
        onClick={onGoogle}
        disabled={busy}
        type="button"
      >
        <span className="ba-google-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.55 5.55 0 0 1-2.4 3.64v3.02h3.86c2.27-2.09 3.56-5.17 3.56-8.9Z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3.02a7.34 7.34 0 0 1-4.07 1.15c-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24Z" />
            <path fill="#FBBC05" d="M5.27 14.26a7.2 7.2 0 0 1 0-4.52V6.63H1.27a12 12 0 0 0 0 10.74l4-3.11Z" />
            <path fill="#EA4335" d="M12 4.78a6.5 6.5 0 0 1 4.6 1.8l3.43-3.43A11.55 11.55 0 0 0 12 0 12 12 0 0 0 1.27 6.63l4 3.11A7.13 7.13 0 0 1 12 4.78Z" />
          </svg>
        </span>
        <span>{busy ? "Memproses..." : t.cta.continueWithGoogle}</span>
      </button>

      <div className="ba-signin-sep" aria-hidden="true"><span>atau</span></div>

      <button
        className="ba-btn-secondary ba-btn-method"
        onClick={onWa}
        disabled={busy}
        type="button"
      >
        <span className="ba-method-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#25D366">
            <path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.93 9.93 0 0 0 4.78 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.02ZM12.04 20.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.12.82.83-3.04-.19-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.25 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.78.97-.14.16-.29.18-.54.06-.25-.12-1.04-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43-.14-.01-.31-.01-.48-.01-.16 0-.43.06-.66.31-.23.25-.86.84-.86 2.05 0 1.21.88 2.38 1 2.55.12.16 1.73 2.64 4.19 3.7.59.25 1.04.41 1.4.52.59.19 1.12.16 1.55.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.23-.18-.48-.31Z"/>
          </svg>
        </span>
        <span>{t.cta.continueWithWhatsApp}</span>
      </button>

      <button
        className="ba-btn-secondary ba-btn-method"
        onClick={onEmail}
        disabled={busy}
        type="button"
      >
        <span className="ba-method-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm9 7.18 8.5-5.18H3.5L12 12.18Zm0 1.64L3.5 8.64V18h17V8.64L12 13.82Z"/>
          </svg>
        </span>
        <span>{t.cta.continueWithEmail}</span>
      </button>
    </div>
  );
}

function OtpForm({
  method,
  sub,
  contact,
  code,
  busy,
  onContactChange,
  onCodeChange,
  onRequest,
  onVerify,
  onBack,
  onChangeContact,
}: {
  method: "wa" | "email";
  sub: SubStep;
  contact: string;
  code: string;
  busy: boolean;
  onContactChange: (v: string) => void;
  onCodeChange: (v: string) => void;
  onRequest: () => void;
  onVerify: () => void;
  onBack: () => void;
  onChangeContact: () => void;
}) {
  const codeRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (sub === "code") codeRef.current?.focus();
  }, [sub]);

  if (sub === "contact") {
    return (
      <form
        className="ba-otp-form"
        onSubmit={(e) => {
          e.preventDefault();
          onRequest();
        }}
        autoComplete="off"
      >
        <label className="ba-field ba-field-full">
          <input
            type={method === "wa" ? "tel" : "email"}
            inputMode={method === "wa" ? "tel" : "email"}
            autoComplete={method === "wa" ? "tel" : "email"}
            placeholder={
              method === "wa"
                ? t.step.signInPhonePlaceholder
                : t.step.signInEmailPlaceholder
            }
            value={contact}
            onChange={(e) => onContactChange(e.target.value)}
            required
          />
        </label>
        <button className="ba-btn-primary" type="submit" disabled={busy}>
          {busy ? "Memproses..." : t.cta.sendCode}
        </button>
        <button
          type="button"
          className="ba-btn-secondary ba-btn-sm"
          onClick={onBack}
          disabled={busy}
        >
          {t.cta.useDifferentMethod}
        </button>
      </form>
    );
  }

  return (
    <form
      className="ba-otp-form"
      onSubmit={(e) => {
        e.preventDefault();
        onVerify();
      }}
      autoComplete="off"
    >
      <p className="ba-muted ba-otp-sent">
        {method === "wa" ? t.step.signInCodeSentWa : t.step.signInCodeSentEmail}{" "}
        <strong>{contact}</strong>
      </p>
      <label className="ba-field ba-field-full">
        <input
          ref={codeRef}
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          autoComplete="one-time-code"
          placeholder={t.step.signInCodePlaceholder}
          value={code}
          onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, ""))}
          className="ba-otp-input"
          required
        />
      </label>
      <button className="ba-btn-primary" type="submit" disabled={busy}>
        {busy ? "Memproses..." : t.cta.verifyCode}
      </button>
      <div className="ba-otp-meta">
        <button
          type="button"
          className="ba-link ba-link-button"
          onClick={onChangeContact}
          disabled={busy}
        >
          {t.cta.useDifferentMethod}
        </button>
        <button
          type="button"
          className="ba-link ba-link-button"
          onClick={onRequest}
          disabled={busy}
        >
          {t.cta.resendCode}
        </button>
      </div>
    </form>
  );
}
