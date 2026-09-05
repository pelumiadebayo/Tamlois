export interface PaystackInitializeRequest {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata: {
    bookingId: string;
    bookingReference: string;
    customerUid: string;
    paymentOption: string;
  };
}

export interface PaystackInitializeResponse {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export interface VerifiedPaystackTransaction {
  id: string;
  status: string;
  reference: string;
  amountKobo: number;
  currency: string;
  customerEmail: string;
  paidAt?: string;
  channel?: string;
  gatewayStatus?: string;
  metadata: Record<string, unknown>;
  authorizationSummary?: {
    brand?: string;
    last4?: string;
    reusable?: boolean;
  };
}

export interface PaymentGateway {
  initialize(
    request: PaystackInitializeRequest,
  ): Promise<PaystackInitializeResponse>;
  verify(reference: string): Promise<VerifiedPaystackTransaction>;
}

type PaystackEnvelope<T> = {
  status: boolean;
  message: string;
  data: T;
};

export class PaystackPaymentGateway implements PaymentGateway {
  constructor(
    private readonly secretKey: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async initialize(
    request: PaystackInitializeRequest,
  ): Promise<PaystackInitializeResponse> {
    const response = await this.fetcher(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: request.email,
          amount: String(request.amountKobo),
          currency: "NGN",
          reference: request.reference,
          callback_url: request.callbackUrl,
          metadata: request.metadata,
        }),
        signal: AbortSignal.timeout(12_000),
      },
    );
    const body = (await response.json()) as PaystackEnvelope<{
      authorization_url: string;
      access_code: string;
      reference: string;
    }>;
    if (!response.ok || !body.status || !body.data?.authorization_url)
      throw new Error("PAYSTACK_INITIALIZATION_FAILED");
    return {
      authorizationUrl: body.data.authorization_url,
      accessCode: body.data.access_code,
      reference: body.data.reference,
    };
  }

  async verify(reference: string): Promise<VerifiedPaystackTransaction> {
    const response = await this.fetcher(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${this.secretKey}` },
        signal: AbortSignal.timeout(12_000),
      },
    );
    const body = (await response.json()) as PaystackEnvelope<{
      id: number | string;
      status: string;
      reference: string;
      amount: number;
      currency: string;
      paid_at?: string;
      channel?: string;
      gateway_response?: string;
      customer?: { email?: string };
      metadata?: Record<string, unknown> | string;
      authorization?: {
        brand?: string;
        last4?: string;
        reusable?: boolean;
      };
    }>;
    if (!response.ok || !body.status || !body.data)
      throw new Error("PAYSTACK_VERIFICATION_FAILED");
    const metadata =
      typeof body.data.metadata === "string"
        ? safeJson(body.data.metadata)
        : body.data.metadata ?? {};
    return {
      id: String(body.data.id),
      status: body.data.status,
      reference: body.data.reference,
      amountKobo: body.data.amount,
      currency: body.data.currency,
      customerEmail: String(body.data.customer?.email ?? "").toLowerCase(),
      paidAt: body.data.paid_at,
      channel: body.data.channel,
      gatewayStatus: body.data.gateway_response,
      metadata,
      authorizationSummary: body.data.authorization
        ? {
            brand: bounded(body.data.authorization.brand, 40),
            last4: /^\d{4}$/.test(body.data.authorization.last4 ?? "")
              ? body.data.authorization.last4
              : undefined,
            reusable: body.data.authorization.reusable === true,
          }
        : undefined,
    };
  }
}

function safeJson(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function bounded(value: unknown, max: number) {
  return typeof value === "string" ? value.slice(0, max) : undefined;
}
