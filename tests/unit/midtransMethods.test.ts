import { describe, expect, it } from "vitest";
import { getMethods, PROVIDER_LABEL, PROVIDER_METHODS } from "../../src/src/lib/payments";

describe("Midtrans hosted methods", () => {
  it("uses generic hosted category without merchant channel promises", () => {
    expect(PROVIDER_LABEL.midtrans).toBe("Midtrans");
    expect(getMethods("midtrans").map((method) => method.key)).toEqual(["HOSTED"]);
    expect(getMethods(null)).toBe(PROVIDER_METHODS.xendit);
    expect(getMethods("dipay").map((method) => method.key)).toEqual(["QRIS"]);
  });
});
