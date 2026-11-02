// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { BeliAmanProvider, useBeliAman } from "../../src/src/BeliAmanProvider";

vi.mock("../../src/src/lib/firebase", () => ({
  initFirebase: vi.fn(), watchUser: () => () => {},
  resolveRedirectSignIn: async () => null,
  getFirebaseAuth: () => ({ currentUser: null }),
}));
vi.mock("../../src/src/theme/apply", () => ({ applyBrandTheme: vi.fn() }));
vi.mock("../../src/src/shells/DesktopModal", () => ({ DesktopModal: () => null }));
vi.mock("../../src/src/shells/MobileSheet", () => ({ MobileSheet: () => null }));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let context: ReturnType<typeof useBeliAman>;
function Capture() { context = useBeliAman(); return null; }
let cleanup = () => {};
afterEach(() => { cleanup(); vi.unstubAllGlobals(); sessionStorage.clear(); });

async function setup() {
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  const requests: { url: string; body: any }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
    requests.push({ url, body: JSON.parse(String(init.body)) });
    return new Response(JSON.stringify({ id: "test-order", state: "AUTHED", items: [] }), { status: 200 });
  }));
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  cleanup = () => { act(() => root.unmount()); container.remove(); };
  await act(async () => root.render(<BeliAmanProvider config={{ bapUrl: "https://example.invalid", firebase: {} as any, brand: { slug: "consumerland" } as any }}><Capture /></BeliAmanProvider>));
  act(() => context.open({ brandSlug: "consumerland", items: [{ sku: "CL-AWARDS-ENTRY", qty: 1 }] }));
  return requests;
}

it("serializes the normalized destination at order-body level and binds the same address", async () => {
  const requests = await setup();
  const shipping = { courier_code: "11", courier_service_code: "1103", price_idr: 18000 };
  await act(async () => context.submitCartReview({ addressInline: { postal_code: " 12190 ", line1: "Test" }, shipping }));
  expect(requests[0]).toEqual({ url: "https://example.invalid/api/v1/orders", body: {
    brand_slug: "consumerland", destination_postal_code: "12190",
    items: [{ sku: "CL-AWARDS-ENTRY", qty: 1 }], shipping,
  } });
  expect(requests[0].body.shipping).not.toHaveProperty("destination_postal_code");
  expect(requests[1].body.address_inline).toEqual({ postal_code: "12190", line1: "Test" });
  expect(context.step).toBe("confirm");
});

it.each([undefined, "", "1219", "121900", "abcde", 12190])("rejects invalid destination %s before any request", async (postal_code) => {
  const requests = await setup();
  await act(async () => context.submitCartReview({ addressInline: { postal_code } }));
  expect(requests).toEqual([]);
  expect(context.step).not.toBe("confirm");
});
