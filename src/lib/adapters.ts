import type { Booking, Product } from "../types";
import { products } from "../data/content";

export interface PaymentProvider {
  createPayment(
    booking: Booking,
    amount: number,
  ): Promise<{ status: "paid" | "pending"; reference: string }>;
}
export class MockPaymentProvider implements PaymentProvider {
  async createPayment(booking: Booking) {
    return { status: "paid" as const, reference: `MOCK-${booking.reference}` };
  }
}
export class PaystackPaymentProvider implements PaymentProvider {
  async createPayment(): Promise<never> {
    throw new Error(
      "Paystack is disabled. Configure a secure verification backend before enabling it.",
    );
  }
}

export interface NotificationProvider {
  bookingReceived(booking: Booking): Promise<void>;
}
export class MockNotificationProvider implements NotificationProvider {
  async bookingReceived(_booking: Booking) {
    return Promise.resolve();
  }
}

export interface CommerceProvider {
  listProducts(): Promise<Product[]>;
  buy(product: Product): Promise<void>;
}
export class MockCommerceProvider implements CommerceProvider {
  async listProducts() {
    return products;
  }
  async buy(product: Product) {
    window.alert(
      `Demo shop: ${product.title} was not purchased. Connect Shopify to enable checkout.`,
    );
  }
}
export class ShopifyCommerceProvider implements CommerceProvider {
  private endpoint: string;
  constructor(
    private domain: string,
    private token: string,
    private collectionId: string,
  ) {
    this.endpoint = `https://${domain.replace(/^https?:\/\//, "").replace(/\/$/, "")}/api/2026-04/graphql.json`;
  }
  private async request<T>(
    query: string,
    variables: Record<string, unknown>,
  ): Promise<T> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": this.token,
      },
      body: JSON.stringify({ query, variables }),
    });
    const payload = (await response.json()) as {
      data?: T;
      errors?: { message: string }[];
    };
    if (!response.ok || payload.errors?.length || !payload.data)
      throw new Error(
        payload.errors?.[0]?.message || "Shopify could not be reached.",
      );
    return payload.data;
  }
  async listProducts(): Promise<Product[]> {
    type Result = {
      collection: {
        products: {
          nodes: Array<{
            id: string;
            title: string;
            description: string;
            productType: string;
            featuredImage?: { url: string; altText?: string };
            variants: {
              nodes: Array<{
                id: string;
                availableForSale: boolean;
                price: { amount: string };
              }>;
            };
          }>;
        };
      } | null;
    };
    const data = await this.request<Result>(
      `query CollectionProducts($id: ID!) { collection(id: $id) { products(first: 50) { nodes { id title description productType featuredImage { url altText } variants(first: 1) { nodes { id availableForSale price { amount currencyCode } } } } } } }`,
      { id: this.collectionId },
    );
    if (!data.collection) return [];
    return data.collection.products.nodes.map((item) => {
      const variant = item.variants.nodes[0];
      return {
        id: item.id,
        title: item.title,
        summary: item.description,
        price: Number(variant?.price.amount || 0),
        category: item.productType || "Products",
        available: Boolean(variant?.availableForSale),
        featured: false,
        image: item.featuredImage?.url || "",
        imageAlt: item.featuredImage?.altText || item.title,
        variantId: variant?.id,
      };
    });
  }
  async buy(product: Product): Promise<void> {
    if (!product.variantId)
      throw new Error("This product has no purchasable Shopify variant.");
    type Result = {
      cartCreate: {
        cart: { checkoutUrl: string } | null;
        userErrors: { message: string }[];
      };
    };
    const data = await this.request<Result>(
      `mutation CreateCart($input: CartInput!) { cartCreate(input: $input) { cart { checkoutUrl } userErrors { message } } }`,
      { input: { lines: [{ merchandiseId: product.variantId, quantity: 1 }] } },
    );
    if (!data.cartCreate.cart || data.cartCreate.userErrors.length)
      throw new Error(
        data.cartCreate.userErrors[0]?.message ||
          "Shopify checkout could not be created.",
      );
    window.location.assign(data.cartCreate.cart.checkoutUrl);
  }
}

export const shopifyEnabled = Boolean(
  import.meta.env.VITE_SHOPIFY_STORE_DOMAIN &&
    import.meta.env.VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN &&
    import.meta.env.VITE_SHOPIFY_BUY_BUTTON_COLLECTION_ID,
);
export const commerceProvider: CommerceProvider = shopifyEnabled
  ? new ShopifyCommerceProvider(
      import.meta.env.VITE_SHOPIFY_STORE_DOMAIN,
      import.meta.env.VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN,
      import.meta.env.VITE_SHOPIFY_BUY_BUTTON_COLLECTION_ID,
    )
  : new MockCommerceProvider();
