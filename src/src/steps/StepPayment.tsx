"use client";

import { useEffect, useMemo, useState } from "react";

import { useBeliAman } from "../BeliAmanProvider";
import { formatIDR, t } from "../lib/i18n";

// Mock VA number, payment code, expiry timer. Demo only.
const MOCK_VA_NUMBER = "8808 1234 5678 9012";
const MOCK_PAY_CODE = "123 4567 8901";
const TABS = [
  { id: "va" as const, label: t.payment.tabVA },
  { id: "ewallet" as const, label: t.payment.tabEwallet },
  { id: "qris" as const, label: t.payment.tabQris },
  { id: "card" as const, label: t.payment.tabCard },
  { id: "retail" as const, label: t.payment.tabRetail },
];

const VA_BANKS = ["BCA", "Mandiri", "BNI", "BRI", "Permata"];
const EWALLETS = ["GoPay", "OVO", "DANA", "ShopeePay", "LinkAja"];
const RETAIL = ["Alfamart", "Indomaret"];

export function StepPayment() {
  const { order, paymentTab, setPaymentTab, paymentBank, setPaymentBank, confirmPayment } = useBeliAman();
  const total = order?.total_idr ?? 0;

  const [secondsLeft, setSecondsLeft] = useState(90 * 60); // 1h 30m
  useEffect(() => {
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  const timer = useMemo(() => {
    const h = Math.floor(secondsLeft / 3600);
    const m = Math.floor((secondsLeft % 3600) / 60);
    const s = secondsLeft % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [secondsLeft]);

  const [copied, setCopied] = useState(false);
  const handleCopy = (val: string) => {
    if (navigator.clipboard) navigator.clipboard.writeText(val.replace(/\s/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const [busy, setBusy] = useState(false);
  const handlePaid = async () => {
    setBusy(true);
    try {
      await confirmPayment();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ba-step ba-step-payment">
      <div className="ba-xendit-bar">
        <div className="ba-xendit-bar-left">
          <span className="ba-xendit-logo">⬣ Beli Aman × Xendit</span>
          <span className="ba-muted">{t.field.expiresIn}</span>
          <span className="ba-timer">{timer}</span>
        </div>
        <div className="ba-xendit-bar-right">
          <span className="ba-muted">Total</span>
          <strong className="ba-xendit-amount">{formatIDR(total)}</strong>
        </div>
      </div>

      <div className="ba-pay-tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={paymentTab === tab.id}
            className={`ba-pay-tab ${paymentTab === tab.id ? "ba-pay-tab-active" : ""}`}
            onClick={() => setPaymentTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="ba-pay-pane">
        {paymentTab === "va" ? (
          <div>
            <div className="ba-bank-row">
              {VA_BANKS.map((b) => (
                <button
                  key={b}
                  className={`ba-bank-card ${paymentBank === b ? "ba-bank-card-active" : ""}`}
                  onClick={() => setPaymentBank(b)}
                >
                  <span className="ba-bank-logo">{b.slice(0, 2).toUpperCase()}</span>
                  <span className="ba-bank-name">{b}</span>
                </button>
              ))}
            </div>
            <div className="ba-va-card">
              <div className="ba-muted">{t.field.vaNumber} ({paymentBank})</div>
              <div className="ba-va-number-row">
                <span className="ba-va-number">{MOCK_VA_NUMBER}</span>
                <button className="ba-btn-secondary" onClick={() => handleCopy(MOCK_VA_NUMBER)}>
                  {copied ? t.field.copied : t.field.copy}
                </button>
              </div>
              <p className="ba-muted">{t.payment.vaInstruction}</p>
            </div>
          </div>
        ) : null}

        {paymentTab === "ewallet" ? (
          <div>
            <div className="ba-bank-row">
              {EWALLETS.map((b) => (
                <button
                  key={b}
                  className={`ba-bank-card ${paymentBank === b ? "ba-bank-card-active" : ""}`}
                  onClick={() => setPaymentBank(b)}
                >
                  <span className="ba-bank-logo">{b.slice(0, 2).toUpperCase()}</span>
                  <span className="ba-bank-name">{b}</span>
                </button>
              ))}
            </div>
            <div className="ba-qr-card">
              <QRPlaceholder label={paymentBank} />
              <p className="ba-muted">{t.payment.ewalletInstruction}</p>
              <button className="ba-btn-secondary">Buka di aplikasi {paymentBank}</button>
            </div>
          </div>
        ) : null}

        {paymentTab === "qris" ? (
          <div className="ba-qr-card">
            <QRPlaceholder label="QRIS" />
            <p className="ba-muted">{t.payment.qrisInstruction}</p>
          </div>
        ) : null}

        {paymentTab === "card" ? (
          <div className="ba-card-form">
            <label className="ba-field ba-field-full">
              <span>Nomor Kartu</span>
              <input placeholder="4567 1234 5678 9012" />
            </label>
            <label className="ba-field">
              <span>Berlaku</span>
              <input placeholder="MM/YY" />
            </label>
            <label className="ba-field">
              <span>CVV</span>
              <input placeholder="123" maxLength={4} />
            </label>
            <p className="ba-fineprint">{t.payment.cardSecure}</p>
          </div>
        ) : null}

        {paymentTab === "retail" ? (
          <div>
            <div className="ba-bank-row">
              {RETAIL.map((b) => (
                <button
                  key={b}
                  className={`ba-bank-card ${paymentBank === b ? "ba-bank-card-active" : ""}`}
                  onClick={() => setPaymentBank(b)}
                >
                  <span className="ba-bank-logo">{b.slice(0, 2).toUpperCase()}</span>
                  <span className="ba-bank-name">{b}</span>
                </button>
              ))}
            </div>
            <div className="ba-va-card">
              <div className="ba-muted">{t.field.paymentCode} ({paymentBank})</div>
              <div className="ba-va-number-row">
                <span className="ba-va-number">{MOCK_PAY_CODE}</span>
                <button className="ba-btn-secondary" onClick={() => handleCopy(MOCK_PAY_CODE)}>
                  {copied ? t.field.copied : t.field.copy}
                </button>
              </div>
              <p className="ba-muted">{t.payment.retailInstruction}</p>
            </div>
          </div>
        ) : null}
      </div>

      <button className="ba-btn-primary ba-cta-fw" onClick={handlePaid} disabled={busy}>
        {busy ? "Memproses..." : t.cta.iHavePaid}
      </button>

      <p className="ba-fineprint ba-center">
        🛡️ Dana ditahan oleh Beli Aman sampai Anda menerima barang.
      </p>
    </div>
  );
}

function QRPlaceholder({ label }: { label: string }) {
  // Hand-drawn-ish QR placeholder. Visually conveys "this would be a QR" without
  // pretending to be a real one.
  const cells = 21;
  const size = 200;
  const cell = size / cells;
  const filled = (i: number, j: number) => (i + j) % 3 === 0 || (i * j) % 5 === 0;
  return (
    <div className="ba-qr-wrap" aria-label={`QR pembayaran ${label}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
        <rect width={size} height={size} fill="#fff" />
        {Array.from({ length: cells }).map((_, i) =>
          Array.from({ length: cells }).map((_, j) =>
            filled(i, j) ? (
              <rect key={`${i}-${j}`} x={j * cell} y={i * cell} width={cell} height={cell} fill="#0F172A" />
            ) : null,
          ),
        )}
        {/* Position markers */}
        <PositionMarker x={0} y={0} size={cell * 7} />
        <PositionMarker x={size - cell * 7} y={0} size={cell * 7} />
        <PositionMarker x={0} y={size - cell * 7} size={cell * 7} />
      </svg>
      <span className="ba-qr-label">{label}</span>
    </div>
  );
}

function PositionMarker({ x, y, size }: { x: number; y: number; size: number }) {
  const inset = size / 7;
  return (
    <g>
      <rect x={x} y={y} width={size} height={size} fill="#fff" />
      <rect x={x} y={y} width={size} height={size} fill="none" stroke="#0F172A" strokeWidth={inset} />
      <rect x={x + inset * 2} y={y + inset * 2} width={inset * 3} height={inset * 3} fill="#0F172A" />
    </g>
  );
}
