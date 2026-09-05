import { describe, expect, it } from "vitest";
import {
  isValidPaystackSignature,
  paystackSignature,
} from "./webhook.js";

describe("Paystack webhook signatures", () => {
  const secret = "sk_test_example_only";
  const body = Buffer.from(
    JSON.stringify({ event: "charge.success", data: { reference: "ref-1" } }),
  );

  it("accepts an exact HMAC SHA-512 signature", () => {
    expect(
      isValidPaystackSignature(body, paystackSignature(body, secret), secret),
    ).toBe(true);
  });

  it("rejects invalid, malformed and payload-mismatched signatures", () => {
    expect(isValidPaystackSignature(body, "not-a-signature", secret)).toBe(
      false,
    );
    expect(
      isValidPaystackSignature(
        Buffer.from("different"),
        paystackSignature(body, secret),
        secret,
      ),
    ).toBe(false);
  });
});
