import React, { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { OrderResponse } from "../../src/src/lib/api";

const firebaseMocks = vi.hoisted(() => ({
  initFirebase: vi.fn(),
  getFirebaseAuth: vi.fn(() => ({ currentUser: null })),
  resolveRedirectSignIn: vi.fn().mockResolvedValue(null),
  watchUser: vi.fn((_config: unknown, callback: (user: null) => void) => {
    callback(null);
    return vi.fn();
  }),
  signInWithGoogle: vi.fn(),
  signOutCurrent: vi.fn(),
}));

const apiMocks = vi.hoisted(() => ({
  getOrder: vi.fn(),
}));

vi.mock("../../src/src/shells/DesktopModal", () => ({
  DesktopModal: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="shell" data-title={title}>{children}</div>
  ),
}));
vi.mock("../../src/src/shells/MobileSheet", () => ({
  MobileSheet: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="shell" data-title={title}>{children}</div>
  ),
}));
vi.mock("../../src/src/steps/StepPayment", () => ({ StepPayment: () => <div>payment</div> }));

vi.mock("../../src/src/lib/firebase", () => firebaseMocks);
vi.mock("../../src/src/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/src/lib/api")>();
  return {
    ...actual,
    api: {
      ...actual.api,
      getOrder: apiMocks.getOrder,
    },
  };
});

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

import {
  BeliAmanProvider,
  useBeliAman,
  type BeliAmanConfig,
} from "../../src/src/BeliAmanProvider";

const CONFIG: BeliAmanConfig = {
  bapUrl: "https://api.example.com",
  firebase: {
    apiKey: "key",
    authDomain: "example.firebaseapp.com",
    projectId: "example",
    appId: "app-id",
  },
  brand: {
    slug: "brand",
    name: "Brand",
    fonts: { heading: "sans-serif", body: "sans-serif" },
    colors: {
      primary: "#0f766e",
      primaryFg: "#ffffff",
      secondary: "#10b981",
      accent: "#10b981",
      bg: "#ffffff",
      surface: "#ffffff",
      text: "#0f172a",
      textMuted: "#64748b",
    },
    radius: { sm: "4px", md: "8px", lg: "12px" },
    copy: { addToCart: "Tambah", buyNow: "Beli", beliAman: "Bayar Aman" },
  },
};

const ORDER: OrderResponse = {
  id: "order-restored",
  state: "PAYMENT_PENDING",
  total_idr: 125_000,
  subtotal_idr: 120_000,
  shipping_idr: 5_000,
  fee_idr: 0,
  items: [],
  created_at: "2026-09-23T00:00:00Z",
  payment_method_snapshot: {
    payment_provider: "dipay",
    invoice_id: "dip-1",
    invoice_url: "https://cdn.example.com/dip-1.png",
    qris_content: "00020101021126610014COM.GO-JEK.WWW",
    qris_image_url: "https://cdn.example.com/dip-1.png",
  },
};

function ContextProbe({ onValue }: { onValue: (value: ReturnType<typeof useBeliAman>) => void }) {
  const value = useBeliAman();
  useEffect(() => onValue(value), [onValue, value]);
  return null;
}

function renderProvider(onValue: (value: ReturnType<typeof useBeliAman>) => void): {
  container: HTMLDivElement;
  root: Root;
} {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      <BeliAmanProvider config={CONFIG}>
        <ContextProbe onValue={onValue} />
      </BeliAmanProvider>,
    );
  });
  return { container, root };
}

describe("BeliAmanProvider payment restoration", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    window.sessionStorage.clear();
  });

  afterEach(() => {
    document.body.replaceChildren();
    window.sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("restores the provider and canonical qris_* invoice fields from the order snapshot", async () => {
    window.sessionStorage.setItem(
      "ba_flow_v1",
      JSON.stringify({
        step: "payment",
        brandSlug: "brand",
        items: [{ sku: "SKU-1", qty: 1 }],
        paymentProvider: "xendit",
        orderId: ORDER.id,
        resumeUrl: window.location.href,
      }),
    );
    apiMocks.getOrder.mockResolvedValue(ORDER);
    let latest: ReturnType<typeof useBeliAman> | undefined;
    const onValue = vi.fn((value: ReturnType<typeof useBeliAman>) => {
      latest = value;
    });

    const { root, container } = renderProvider(onValue);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(apiMocks.getOrder).toHaveBeenCalledWith(expect.any(Object), ORDER.id);
    expect(latest?.isOpen).toBe(true);
    expect(latest?.step).toBe("payment");
    expect(latest?.paymentProvider).toBe("dipay");
    expect(latest?.invoice).toMatchObject({
      invoice_id: "dip-1",
      invoice_url: "https://cdn.example.com/dip-1.png",
      qris_content: "00020101021126610014COM.GO-JEK.WWW",
      qr_content: "00020101021126610014COM.GO-JEK.WWW",
      qris_image_url: "https://cdn.example.com/dip-1.png",
      qr_image_url: "https://cdn.example.com/dip-1.png",
    });

    act(() => root.unmount());
    container.remove();
  });
});
