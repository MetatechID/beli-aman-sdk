import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StepPayment } from "../../src/src/steps/StepPayment";
import type { useBeliAman as UseBeliAman } from "../../src/src/BeliAmanProvider";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const useBeliAmanMock = vi.fn<ReturnType<typeof UseBeliAman>, []>();

vi.mock("../../src/src/BeliAmanProvider", () => ({
  useBeliAman: () => useBeliAmanMock(),
}));

const ORDER = {
  id: "order-1",
  state: "PAYMENT_PENDING",
  total_idr: 125_000,
  subtotal_idr: 120_000,
  shipping_idr: 5_000,
  fee_idr: 0,
  items: [],
  created_at: "2026-09-23T00:00:00Z",
};

function paymentContext(overrides: Record<string, unknown> = {}) {
  return {
    order: ORDER,
    invoice: {
      order_id: ORDER.id,
      state: ORDER.state,
      provider: "dipay",
      invoice_id: "invoice-1",
      invoice_url: "https://cdn.example.com/qr.png",
      qris_content: "00020101021126610014COM.GO-JEK.WWW",
      qris_image_url: null,
    },
    refreshOrder: vi.fn().mockResolvedValue(ORDER),
    goTo: vi.fn(),
    paymentProvider: "dipay",
    ...overrides,
  } as unknown as ReturnType<typeof UseBeliAman>;
}

function renderStep(): { container: HTMLDivElement; root: Root } {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  act(() => root.render(<StepPayment />));
  return { container, root };
}

function cleanup(root: Root, container: HTMLElement) {
  act(() => root.unmount());
  container.remove();
}

describe("StepPayment", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("shows provider-aware branding and suppresses raw QR PNG checkout links", () => {
    useBeliAmanMock.mockReturnValue(
      paymentContext({
        invoice: {
          order_id: ORDER.id,
          state: ORDER.state,
          provider: "dipay",
          invoice_id: "invoice-1",
          invoice_url: "https://cdn.example.com/qr.png",
          qris_content: null,
          qris_image_url: "https://cdn.example.com/qr.png",
        },
      }),
    );

    const { container, root } = renderStep();
    expect(container.textContent).toContain("Beli Aman × Dipay");
    expect(container.querySelector('img[src="https://cdn.example.com/qr.png"]')).not.toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.querySelector('a[href="https://cdn.example.com/qr.png"]')).toBeNull();
    cleanup(root, container);
  });

  it("treats a Dipay image-only invoice URL as QR content, never hosted checkout", () => {
    const pngUrl = "https://cdn.example.com/qris/order-1.PNG?token=signed";
    useBeliAmanMock.mockReturnValue(
      paymentContext({
        invoice: {
          order_id: ORDER.id,
          state: ORDER.state,
          provider: "dipay",
          invoice_id: "dip-image-only",
          invoice_url: pngUrl,
          qris_content: null,
          qris_image_url: null,
        },
      }),
    );

    const { container, root } = renderStep();
    expect(container.querySelector("img")?.getAttribute("src")).toBe(pngUrl);
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
    cleanup(root, container);
  });

  it("preserves a signed Dipay development mock as hosted checkout", () => {
    const mockUrl = "https://api.example.com/api/mock-checkout/dipay-dev-order-1?token=signed";
    useBeliAmanMock.mockReturnValue(
      paymentContext({
        invoice: {
          order_id: ORDER.id,
          state: ORDER.state,
          provider: "dipay",
          invoice_id: "dipay-dev-order-1",
          invoice_url: mockUrl,
          qris_content: null,
          qris_image_url: null,
        },
      }),
    );

    const { container, root } = renderStep();
    expect(container.querySelector("iframe")?.getAttribute("src")).toBe(mockUrl);
    expect(container.querySelector("a")?.getAttribute("href")).toBe(mockUrl);
    expect(container.querySelector('img[src=""]')).toBeNull();
    expect(container.textContent).not.toContain("Kode QRIS tidak tersedia");
    cleanup(root, container);
  });

  it("preserves the hosted checkout iframe and accessible action for non-QR providers", () => {
    useBeliAmanMock.mockReturnValue(
      paymentContext({
        paymentProvider: "oy",
        invoice: {
          order_id: ORDER.id,
          state: ORDER.state,
          provider: "oy",
          invoice_id: "invoice-oy",
          invoice_url: "https://pay.example.com/invoice-oy",
        },
      }),
    );

    const { container, root } = renderStep();
    const iframe = container.querySelector("iframe");
    const link = container.querySelector("a");
    expect(container.textContent).toContain("Beli Aman × OY Indonesia");
    expect(iframe?.getAttribute("src")).toBe("https://pay.example.com/invoice-oy");
    expect(iframe?.getAttribute("title")).toBe("Beli Aman × OY Indonesia");
    expect(link?.getAttribute("href")).toBe("https://pay.example.com/invoice-oy");
    expect(link?.textContent).toContain("Buka di tab baru");
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
    cleanup(root, container);
  });

  it("shows an explicit fallback for a malformed Dipay invoice and keeps polling", async () => {
    const refreshOrder = vi.fn().mockResolvedValue({ ...ORDER, state: "ESCROW_HELD" });
    const goTo = vi.fn();
    useBeliAmanMock.mockReturnValue(
      paymentContext({
        refreshOrder,
        goTo,
        invoice: {
          order_id: ORDER.id,
          state: ORDER.state,
          provider: "dipay",
          invoice_id: "invoice-bad",
          invoice_url: "",
          qris_content: " ",
          qris_image_url: null,
        },
      }),
    );

    const { container, root } = renderStep();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Kode QRIS tidak tersedia",
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    expect(refreshOrder).toHaveBeenCalledTimes(1);
    expect(goTo).toHaveBeenCalledWith("done");
    cleanup(root, container);
  });
});
