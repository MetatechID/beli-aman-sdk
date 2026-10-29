import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { StepCartReview } from "../../src/src/steps/StepCartReview";

const mocks = vi.hoisted(() => ({ context: {} as any, rates: vi.fn() }));
vi.mock("../../src/src/BeliAmanProvider", () => ({ useBeliAman: () => mocks.context }));
vi.mock("../../src/src/lib/api", () => ({ api: { shippingRates: mocks.rates } }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
const rate = (price: number) => ({ courier_code: "courier", courier_service_code: "regular", courier_service_name: "Regular", duration: "2 days", price });
const deferred = () => {
  let resolve!: (value: any) => void;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
};
const render = () => act(() => root.render(<StepCartReview />));
const tick = () => act(async () => { await vi.advanceTimersByTimeAsync(350); });
const button = () => container.querySelector<HTMLButtonElement>(".ba-cta-fw")!;
function postal(value: string) {
  const input = Array.from(container.querySelectorAll("input")).find((el) => el.inputMode === "numeric")!;
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Unexpected network")));
  mocks.rates.mockReset();
  mocks.context = {
    apiOpts: { bapUrl: "https://bap.example.invalid" }, brandTheme: { colors: { primary: "#000" } },
    submitCartReview: vi.fn().mockResolvedValue(undefined), displayName: "Buyer", email: "buyer@example.invalid",
    brandSlug: "store", items: [{ sku: "sku", qty: 1 }],
    defaultAddress: { recipient_name: "Buyer", phone_e164: "+628123456789", line1: "Test", postal_code: "12190" },
    paymentProvider: "dipay",
  };
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("submits the destination bound to the displayed rate", async () => {
  mocks.rates.mockResolvedValue({ data: [rate(12000)] });
  render();
  await tick();
  expect(button().disabled).toBe(false);
  await act(async () => button().click());
  expect(mocks.context.submitCartReview).toHaveBeenCalledWith(expect.objectContaining({
    shipping: expect.objectContaining({ destination_postal_code: "12190", price_idr: 12000 }),
  }));
});

it("invalidates immediately on address changes and replaces the old price for the same service", async () => {
  const next = deferred();
  mocks.rates.mockResolvedValueOnce({ data: [rate(12000)] }).mockReturnValueOnce(next.promise);
  render();
  await tick();
  postal("54321");
  expect(button().disabled).toBe(true);
  await tick();
  await act(async () => next.resolve({ data: [rate(25000)] }));
  await act(async () => button().click());
  expect(mocks.context.submitCartReview).toHaveBeenCalledWith(expect.objectContaining({
    shipping: expect.objectContaining({ destination_postal_code: "54321", price_idr: 25000 }),
  }));
});

it("ignores late responses for a previous destination", async () => {
  const old = deferred();
  mocks.rates.mockReturnValueOnce(old.promise).mockResolvedValueOnce({ data: [rate(30000)] });
  render();
  await tick();
  postal("54321");
  await tick();
  await act(async () => old.resolve({ data: [rate(1000)] }));
  await act(async () => button().click());
  expect(mocks.context.submitCartReview).toHaveBeenCalledWith(expect.objectContaining({
    shipping: expect.objectContaining({ destination_postal_code: "54321", price_idr: 30000 }),
  }));
});

it("does not retain a usable rate after a failed refresh or invalid destination", async () => {
  mocks.rates.mockResolvedValueOnce({ data: [rate(12000)] }).mockRejectedValueOnce(new Error("Unavailable"));
  render();
  await tick();
  postal("54321");
  await tick();
  expect(button().disabled).toBe(true);
  postal("bad");
  expect(button().disabled).toBe(true);
  expect(mocks.context.submitCartReview).not.toHaveBeenCalled();
});

it("invalidates rates when tenant or cart items change", async () => {
  mocks.rates.mockResolvedValueOnce({ data: [rate(12000)] }).mockReturnValue(new Promise(() => {}));
  render();
  await tick();
  mocks.context = { ...mocks.context, brandSlug: "another", items: [{ sku: "different", qty: 2 }] };
  render();
  expect(button().disabled).toBe(true);
  await tick();
  expect(mocks.rates).toHaveBeenLastCalledWith(mocks.context.apiOpts, expect.objectContaining({ brand_slug: "another", items: mocks.context.items }));
});
