"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useBeliAman } from "../BeliAmanProvider";
import { api, type ShippingRate } from "../lib/api";
import { formatIDR, t } from "../lib/i18n";

interface CartLine {
  sku: string;
  name: string;
  qty: number;
  unit_price_idr: number;
  image: string | null;
}

export function StepCartReview() {
  const {
    apiOpts,
    brandTheme,
    submitCartReview,
    displayName,
    photoUrl,
    email,
    brandSlug,
    items,
    defaultAddress,
  } = useBeliAman();

  const [previewLines, setPreviewLines] = useState<CartLine[]>([]);
  const [previewTotal, setPreviewTotal] = useState(0);
  const [loadingPreview, setLoadingPreview] = useState(true);

  // Address form state — pre-filled with reasonable defaults so the demo
  // can speed through; user can edit.
  const [recipientName, setRecipientName] = useState(displayName || "");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [kota, setKota] = useState("Jakarta");
  const [provinsi, setProvinsi] = useState("DKI Jakarta");
  const [postalCode, setPostalCode] = useState("12190");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // --- Shipping rate selector state ---
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);
  const rateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setRecipientName(displayName || "");
  }, [displayName]);

  // Pre-fill the address form from the user's saved Beli Aman address — same
  // identity, same address, across every storefront in the network.
  useEffect(() => {
    if (!defaultAddress) return;
    if (defaultAddress.recipient_name) setRecipientName(defaultAddress.recipient_name);
    if (defaultAddress.phone_e164) setPhone(defaultAddress.phone_e164);
    if (defaultAddress.line1) setLine1(defaultAddress.line1);
    if (defaultAddress.kota) setKota(defaultAddress.kota);
    if (defaultAddress.provinsi) setProvinsi(defaultAddress.provinsi);
    if (defaultAddress.postal_code) setPostalCode(defaultAddress.postal_code);
  }, [defaultAddress]);

  // For preview, call the public catalog endpoints to get prices/names.
  // Use the brandSlug + items from the provider state directly (these are
  // populated by open() before this step renders) instead of sessionStorage,
  // which races with the initial render and shows an empty preview.
  useEffect(() => {
    if (!brandSlug || items.length === 0) {
      setPreviewLines([]);
      setPreviewTotal(0);
      setLoadingPreview(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingPreview(true);
      try {
        const products = (await fetch(
          apiOpts.bapUrl.replace(/\/$/, "") + `/api/v1/brands/${brandSlug}/products`,
        ).then((r) => r.json())) as any[];
        const bySku = new Map(products.map((p) => [p.sku, p]));
        const lines: CartLine[] = items.map((it) => {
          const p = bySku.get(it.sku);
          return {
            sku: it.sku,
            name: p?.name || it.sku,
            qty: it.qty,
            unit_price_idr: Number(p?.price_idr || 0),
            image: p?.image || null,
          };
        });
        const total = lines.reduce((s, l) => s + l.unit_price_idr * l.qty, 0);
        if (!cancelled) {
          setPreviewLines(lines);
          setPreviewTotal(total);
        }
      } catch {
        // ignore — server will validate again on createOrder
      } finally {
        if (!cancelled) setLoadingPreview(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiOpts.bapUrl, brandSlug, items]);

  // ----- Fetch courier rates whenever postal code or cart changes -----
  const fetchRates = useCallback(async () => {
    if (!brandSlug || items.length === 0) return;
    if (!/^\d{5}$/.test(postalCode.trim())) {
      setRates([]);
      setSelectedRate(null);
      return;
    }
    setRatesLoading(true);
    setRatesError(null);
    try {
      const { data } = await api.shippingRates(apiOpts, {
        brand_slug: brandSlug,
        destination_postal_code: postalCode.trim(),
        items,
      });
      setRates(data);
      setSelectedRate((prev) => {
        if (prev && data.some((r) => r.courier_code === prev.courier_code && r.courier_service_code === prev.courier_service_code)) {
          return prev;
        }
        return data.length > 0 ? data[0] : null;
      });
    } catch (e: any) {
      setRatesError(e?.message || "Gagal memuat ongkir");
      setRates([]);
      setSelectedRate(null);
    } finally {
      setRatesLoading(false);
    }
  }, [apiOpts, brandSlug, items, postalCode]);

  useEffect(() => {
    if (rateDebounceRef.current) clearTimeout(rateDebounceRef.current);
    rateDebounceRef.current = setTimeout(fetchRates, 350);
    return () => {
      if (rateDebounceRef.current) clearTimeout(rateDebounceRef.current);
    };
  }, [fetchRates]);

  const handleContinue = async () => {
    setErr(null);
    if (!recipientName.trim() || !phone.trim() || !line1.trim()) {
      setErr("Lengkapi nama, nomor telepon, dan alamat.");
      return;
    }
    if (!selectedRate) {
      setErr("Pilih kurir pengiriman terlebih dahulu.");
      return;
    }
    setBusy(true);
    try {
      await submitCartReview({
        addressInline: {
          recipient_name: recipientName,
          phone_e164: phone,
          line1,
          kota,
          provinsi,
          postal_code: postalCode,
        },
        shipping: {
          courier_code: selectedRate.courier_code,
          courier_service_code: selectedRate.courier_service_code,
          courier_service_name: selectedRate.courier_service_name,
          price_idr: selectedRate.price,
          duration: selectedRate.duration,
        },
      });
    } catch (e: any) {
      setErr(e?.message || "Gagal melanjutkan");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ba-step ba-step-review">
      <div className="ba-user-pill">
        {photoUrl ? <img src={photoUrl} alt="" className="ba-avatar" /> : null}
        <div>
          <div className="ba-user-name">{displayName || email}</div>
          <div className="ba-user-email">{email}</div>
        </div>
        <span className="ba-verified" title="Verified Google account">
          ✓ Google
        </span>
      </div>

      <section className="ba-section">
        <h3 className="ba-h3">Pesanan Anda</h3>
        {loadingPreview ? (
          <div className="ba-skeleton" />
        ) : (
          <ul className="ba-cart-lines">
            {previewLines.map((l) => (
              <li key={l.sku} className="ba-cart-line">
                {l.image ? <img src={l.image} alt="" className="ba-cart-img" /> : null}
                <div className="ba-cart-meta">
                  <div className="ba-cart-name">{l.name}</div>
                  <div className="ba-muted">×{l.qty}</div>
                </div>
                <div className="ba-cart-price">{formatIDR(l.unit_price_idr * l.qty)}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ba-section">
        <h3 className="ba-h3">{t.field.address}</h3>
        <div className="ba-form-grid">
          <label className="ba-field">
            <span>Nama penerima</span>
            <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Nama lengkap" />
          </label>
          <label className="ba-field">
            <span>Nomor telepon</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+62..." inputMode="tel" />
          </label>
          <label className="ba-field ba-field-full">
            <span>Alamat lengkap</span>
            <input value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="Jalan, no rumah, RT/RW" />
          </label>
          <label className="ba-field">
            <span>Kota</span>
            <input value={kota} onChange={(e) => setKota(e.target.value)} />
          </label>
          <label className="ba-field">
            <span>Provinsi</span>
            <input value={provinsi} onChange={(e) => setProvinsi(e.target.value)} />
          </label>
          <label className="ba-field">
            <span>Kode pos</span>
            <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} inputMode="numeric" />
          </label>
        </div>
      </section>

      <section className="ba-section">
        <h3 className="ba-h3">Pengiriman</h3>
        {ratesLoading ? (
          <div className="ba-skeleton" style={{ height: 56 }} />
        ) : ratesError ? (
          <p className="ba-error-inline">{ratesError}</p>
        ) : rates.length === 0 ? (
          <p className="ba-muted" style={{ fontSize: 13 }}>
            Masukkan kode pos 5 digit untuk melihat opsi kurir.
          </p>
        ) : (
          <div className="ba-shipping-options" style={{ display: "grid", gap: 6 }}>
            {rates.map((r) => {
              const id = `${r.courier_code}:${r.courier_service_code}`;
              const isSel =
                selectedRate?.courier_code === r.courier_code &&
                selectedRate?.courier_service_code === r.courier_service_code;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedRate(r)}
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    border: isSel
                      ? `2px solid ${brandTheme.colors.primary}`
                      : "1px solid rgba(15,23,42,0.12)",
                    borderRadius: "var(--r-md, 10px)",
                    background: isSel ? "rgba(15,118,110,0.04)" : "var(--c-surface, #fff)",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "var(--c-text)" }}>
                      {r.courier_service_name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--c-text-muted)" }}>
                      Estimasi {r.duration} · {r.courier_code.toUpperCase()}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "var(--c-primary)" }}>
                    {formatIDR(r.price)}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="ba-section">
        <h3 className="ba-h3">{t.field.paymentMethod}</h3>
        <div className="ba-pm-card">
          <div className="ba-pm-icon">🏦</div>
          <div className="ba-pm-info">
            <div className="ba-pm-label">BCA Virtual Account</div>
            <div className="ba-muted">Dilindungi escrow Beli Aman</div>
          </div>
          <span className="ba-pill ba-pill-success">Terpilih</span>
        </div>
      </section>

      <section className="ba-section ba-totals">
        <div className="ba-row">
          <span>{t.field.subtotal}</span>
          <strong>{formatIDR(previewTotal)}</strong>
        </div>
        <div className="ba-row">
          <span>{t.field.shipping}</span>
          <strong>{formatIDR(selectedRate?.price ?? 0)}</strong>
        </div>
        <div className="ba-row ba-row-total">
          <span>{t.field.total}</span>
          <strong className="ba-total-amount">{formatIDR(previewTotal + (selectedRate?.price ?? 0))}</strong>
        </div>
      </section>

      {err ? <p className="ba-error-inline">{err}</p> : null}

      <button className="ba-btn-primary ba-cta-fw" onClick={handleContinue} disabled={busy}>
        {busy ? "Memproses..." : t.cta.continueToPayment}
      </button>
    </div>
  );
}

