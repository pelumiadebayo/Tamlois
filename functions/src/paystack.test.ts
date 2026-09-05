import { describe, expect, it, vi } from "vitest";
import { PaystackPaymentGateway } from "./paystack.js";

describe("Paystack HTTP adapter", () => {
  it("maps authoritative initialization fields without leaking the secret", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) =>
      new Response(
        JSON.stringify({
          status: true,
          message: "Authorization URL created",
          data: {
            authorization_url: "https://checkout.paystack.com/access",
            access_code: "access",
            reference: "TAM-reference",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const gateway = new PaystackPaymentGateway(
      "sk_test_not_real",
      fetcher as typeof fetch,
    );
    const result = await gateway.initialize({
      email: "ada@example.com",
      amountKobo: 1_200_000,
      reference: "TAM-reference",
      callbackUrl: "https://example.com/#/booking/payment-callback",
      metadata: {
        bookingId: "booking-id",
        bookingReference: "TAM-BOOKING",
        customerUid: "customer-uid",
        paymentOption: "full",
      },
    });
    expect(result.authorizationUrl).toContain("checkout.paystack.com");
    const [, init] = fetcher.mock.calls[0]!;
    const body = JSON.parse(String(init?.body));
    expect(body).toMatchObject({
      amount: "1200000",
      currency: "NGN",
      email: "ada@example.com",
      reference: "TAM-reference",
    });
    expect(JSON.stringify(body)).not.toContain("sk_test_not_real");
    expect(body.metadata).not.toHaveProperty("concern");
  });

  it("maps verified amount, currency, identity and safe authorization summary", async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          status: true,
          message: "Verification successful",
          data: {
            id: 4099260516,
            status: "success",
            reference: "TAM-reference",
            amount: 1_200_000,
            currency: "NGN",
            customer: { email: "ADA@EXAMPLE.COM" },
            metadata: { bookingId: "booking-id", customerUid: "uid" },
            authorization: {
              brand: "visa",
              last4: "4081",
              reusable: true,
              authorization_code: "must-not-be-retained",
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const gateway = new PaystackPaymentGateway(
      "sk_test_not_real",
      fetcher as typeof fetch,
    );
    const result = await gateway.verify("TAM-reference");
    expect(result).toMatchObject({
      id: "4099260516",
      amountKobo: 1_200_000,
      currency: "NGN",
      customerEmail: "ada@example.com",
      authorizationSummary: { brand: "visa", last4: "4081" },
    });
    expect(result.authorizationSummary).not.toHaveProperty(
      "authorization_code",
    );
  });
});
