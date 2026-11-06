import type { Firestore } from "firebase-admin/firestore";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

const API_ROOT = "https://api.paystack.co";
const PAYSTACK_HOST = "paystack.shop";
const LOCK_ID = "paystack";
const LOCK_TTL_MS = 5 * 60 * 1000;

export function isAuthorizedProductAdmin(uid: string | undefined, ownerUid: string) {
  return Boolean(uid) && uid === ownerUid;
}

type PaystackEnvelope<T> = { status: boolean; message: string; data: T; meta?: { next?: string; page?: number; pageCount?: number } };
type UnknownRecord = Record<string, unknown>;

export interface NormalizedPaystackProduct {
  paystackProductId: string;
  paystackProductCode: string;
  paystackStorefrontSlug: string;
  paystackProductUrl: string;
  sourceName: string;
  sourceDescription: string;
  sourcePrice: number;
  currency: "NGN";
  sourceImageUrl?: string;
  sourceAvailable: boolean;
  sourceQuantity?: number;
}

export interface CommerceSyncResult {
  created: number;
  updated: number;
  unchanged: number;
  flagged: number;
  completedAt: string;
}

export class PaystackCommerceError extends Error {
  constructor(public readonly code: "INVALID_URL" | "WRONG_STOREFRONT" | "NOT_FOUND" | "PAYSTACK_UNAVAILABLE" | "SYNC_RUNNING", message: string) {
    super(message);
    this.name = "PaystackCommerceError";
  }
}

export function parsePaystackProductUrl(value: string, expectedStorefront: string) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.hostname !== PAYSTACK_HOST)
      throw new PaystackCommerceError("INVALID_URL", "Use an HTTPS paystack.shop product link.");
    const storefrontSlug = url.pathname.split("/").filter(Boolean)[0] ?? "";
    const productSlug = url.searchParams.get("product")?.trim() ?? "";
    if (!storefrontSlug || !productSlug)
      throw new PaystackCommerceError("INVALID_URL", "The Paystack link must include a Storefront and product identifier.");
    if (storefrontSlug !== expectedStorefront)
      throw new PaystackCommerceError("WRONG_STOREFRONT", `Only products from paystack.shop/${expectedStorefront} can be imported.`);
    return { storefrontSlug, productSlug };
  } catch (error) {
    if (error instanceof PaystackCommerceError) throw error;
    throw new PaystackCommerceError("INVALID_URL", "Enter a valid Paystack product link.");
  }
}

function string(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function number(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : undefined; }
function safeHttpsUrl(value: unknown) {
  if (typeof value !== "string") return undefined;
  try { const url = new URL(value); return url.protocol === "https:" ? url.toString() : undefined; } catch { return undefined; }
}

/** Paystack's documented Product response currently has no stable image field; accept safe media fields if an account response includes one. */
export function extractPaystackImage(product: UnknownRecord) {
  const direct = [product.image, product.image_url, product.thumbnail, product.thumbnail_url].map(safeHttpsUrl).find(Boolean);
  if (direct) return direct;
  for (const key of ["images", "media"]) {
    const items = product[key];
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      const candidate = typeof item === "string" ? safeHttpsUrl(item) : item && typeof item === "object" ? ["url", "secure_url", "src"].map((field) => safeHttpsUrl((item as UnknownRecord)[field])).find(Boolean) : undefined;
      if (candidate) return candidate;
    }
  }
  return undefined;
}

export function normalizePaystackProduct(product: UnknownRecord, storefrontSlug: string): NormalizedPaystackProduct {
  const id = string(product.id) || String(number(product.id) ?? "");
  const code = string(product.product_code);
  const name = string(product.name);
  const slug = string(product.slug) || code.toLowerCase();
  const priceKobo = number(product.price);
  const currency = string(product.currency).toUpperCase();
  if (!id || !code || !name || priceKobo === undefined || currency !== "NGN")
    throw new PaystackCommerceError("PAYSTACK_UNAVAILABLE", "Paystack returned incomplete or unsupported product data.");
  const quantity = number(product.quantity);
  const unlimited = product.unlimited === true;
  const inStock = typeof product.in_stock === "boolean" ? product.in_stock : unlimited || quantity === undefined || quantity > 0;
  return {
    paystackProductId: id,
    paystackProductCode: code,
    paystackStorefrontSlug: storefrontSlug,
    paystackProductUrl: `https://${PAYSTACK_HOST}/${storefrontSlug}?product=${encodeURIComponent(slug)}`,
    sourceName: name,
    sourceDescription: string(product.description),
    sourcePrice: priceKobo / 100,
    currency: "NGN",
    sourceImageUrl: extractPaystackImage(product),
    sourceAvailable: product.active !== false && inStock,
    sourceQuantity: unlimited ? undefined : quantity,
  };
}

export function paystackProductDocumentId(paystackId: string) { return `paystack-${paystackId.replace(/[^a-zA-Z0-9_-]/g, "-")}`; }
export function mergeProductCache(current: UnknownRecord | undefined, normalized: NormalizedPaystackProduct) {
  return {
    ...(current ?? {}),
    ...normalized,
    ...(current ? {} : {
      displayTitle: "", displaySummary: "", displayImageUrl: "",
      imageAlt: normalized.sourceName, category: "Hair & scalp care",
      featured: false, visible: false, displayOrder: 1,
    }),
    syncStatus: "synced",
  };
}
export function missingPaystackProductIds(cachedIds: string[], remoteIds: string[]) {
  const remote = new Set(remoteIds);
  return cachedIds.filter((id) => !remote.has(id));
}
function sourceChanged(current: UnknownRecord | undefined, value: NormalizedPaystackProduct) {
  if (!current || current.syncStatus !== "synced") return true;
  return (Object.keys(value) as (keyof NormalizedPaystackProduct)[]).some((key) => current[key] !== value[key]);
}

export class PaystackCommerceService {
  constructor(private readonly firestore: Firestore, private readonly secretKey: string, private readonly storefrontSlug: string, private readonly fetcher: typeof fetch = fetch) {}

  private async request<T>(path: string, attempt = 0): Promise<T> {
    try {
      const response = await this.fetcher(`${API_ROOT}${path}`, { headers: { Authorization: `Bearer ${this.secretKey}` }, signal: AbortSignal.timeout(12_000) });
      const body = await response.json() as PaystackEnvelope<T>;
      if (!response.ok || !body.status) {
        if ((response.status === 429 || response.status >= 500) && attempt < 2) return this.request<T>(path, attempt + 1);
        throw new PaystackCommerceError("PAYSTACK_UNAVAILABLE", "Paystack could not complete the product request.");
      }
      return body.data;
    } catch (error) {
      if (error instanceof PaystackCommerceError) throw error;
      if (attempt < 2) return this.request<T>(path, attempt + 1);
      throw new PaystackCommerceError("PAYSTACK_UNAVAILABLE", "Paystack is temporarily unavailable. Existing cached products were preserved.");
    }
  }

  private async paginate(path: string) {
    const results: UnknownRecord[] = [];
    for (let page = 1; page <= 100; page += 1) {
      const separator = path.includes("?") ? "&" : "?";
      const data = await this.request<UnknownRecord[] | { products?: UnknownRecord[] }>(`${path}${separator}perPage=100&page=${page}`);
      const items = Array.isArray(data) ? data : Array.isArray(data.products) ? data.products : [];
      results.push(...items);
      if (items.length < 100) break;
    }
    return results;
  }

  private async storefront() {
    const stores = await this.paginate("/storefront");
    const store = stores.find((item) => string(item.slug) === this.storefrontSlug);
    if (!store) throw new PaystackCommerceError("NOT_FOUND", "The configured Tamlois Storefront was not found in this Paystack account.");
    return store;
  }

  private async storefrontProducts() {
    const store = await this.storefront();
    const storeId = string(store.id) || String(number(store.id) ?? "");
    if (!storeId) throw new PaystackCommerceError("PAYSTACK_UNAVAILABLE", "Paystack returned an invalid Storefront record.");
    const summaries = await this.paginate(`/storefront/${encodeURIComponent(storeId)}/product`);
    const detailed: UnknownRecord[] = [];
    for (const summary of summaries) {
      const id = string(summary.id) || String(number(summary.id) ?? "");
      detailed.push(id ? await this.request<UnknownRecord>(`/product/${encodeURIComponent(id)}`) : summary);
    }
    return detailed;
  }

  private async upsert(normalized: NormalizedPaystackProduct, publishNew = false) {
    const collection = this.firestore.collection("productsCache");
    let ref = collection.doc(paystackProductDocumentId(normalized.paystackProductId));
    let snapshot = await ref.get();
    if (!snapshot.exists) {
      const sameCode = await collection.where("paystackProductCode", "==", normalized.paystackProductCode).limit(1).get();
      if (!sameCode.empty) {
        ref = sameCode.docs[0]!.ref;
        snapshot = sameCode.docs[0]!;
      }
    }
    const current = snapshot.data();
    const changed = sourceChanged(current, normalized);
    const timestamp = FieldValue.serverTimestamp();
    await ref.set({
      id: ref.id,
      ...normalized,
      sourceImageUrl: normalized.sourceImageUrl ?? FieldValue.delete(),
      sourceQuantity: normalized.sourceQuantity ?? FieldValue.delete(),
      syncStatus: "synced",
      lastSyncedAt: timestamp,
      updatedAt: timestamp,
      ...(snapshot.exists ? {} : {
        displayTitle: "", displaySummary: "", displayImageUrl: "",
        imageAlt: normalized.sourceName,
        category: "Hair & scalp care",
        featured: false,
        visible: publishNew,
        displayOrder: await this.nextOrder(),
        createdAt: timestamp,
      }),
    }, { merge: true });
    const saved = await ref.get();
    await this.firestore.collection("productSyncDetails").doc(ref.id).delete().catch(() => undefined);
    return { product: saved.data(), created: !snapshot.exists, changed };
  }

  private async nextOrder() {
    const snapshot = await this.firestore.collection("productsCache").get();
    return snapshot.docs.reduce((highest, item) => Math.max(highest, number(item.data().displayOrder) ?? 0), 0) + 1;
  }

  async importProduct(productUrl: string) {
    const parsed = parsePaystackProductUrl(productUrl, this.storefrontSlug);
    const products = await this.storefrontProducts();
    const match = products.find((item) => string(item.slug) === parsed.productSlug || string(item.product_code) === parsed.productSlug || String(item.id) === parsed.productSlug);
    if (!match) throw new PaystackCommerceError("NOT_FOUND", "That product could not be resolved in the configured Tamlois Storefront.");
    const result = await this.upsert(normalizePaystackProduct(match, this.storefrontSlug));
    return result.product;
  }

  async refreshProduct(productId: string) {
    const ref = this.firestore.collection("productsCache").doc(productId);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new PaystackCommerceError("NOT_FOUND", "The cached product was not found.");
    const paystackId = string(snapshot.data()?.paystackProductId);
    let membership: UnknownRecord[];
    try {
      membership = await this.storefrontProducts();
    } catch (error) {
      const message = error instanceof PaystackCommerceError ? error.message : "Product refresh failed.";
      await Promise.all([
        ref.update({ syncStatus: "sync-error", updatedAt: FieldValue.serverTimestamp() }),
        this.firestore.collection("productSyncDetails").doc(productId).set({ productId, lastError: message, updatedAt: FieldValue.serverTimestamp() }, { merge: true }),
      ]);
      throw error;
    }
    const match = membership.find((item) => String(item.id) === paystackId);
    if (!match) {
      await Promise.all([
        ref.update({ syncStatus: "missing-from-paystack", updatedAt: FieldValue.serverTimestamp() }),
        this.firestore.collection("productSyncDetails").doc(productId).set({ productId, lastError: "This product is not attached to the configured Paystack Storefront.", updatedAt: FieldValue.serverTimestamp() }, { merge: true }),
      ]);
      throw new PaystackCommerceError("NOT_FOUND", "This product is no longer attached to the Tamlois Storefront. The cached record was kept for review.");
    }
    const refreshed = (await this.upsert(normalizePaystackProduct(match, this.storefrontSlug))).product;
    await this.firestore.collection("productSyncDetails").doc(productId).delete().catch(() => undefined);
    return refreshed;
  }

  private async acquireLock(uid: string) {
    const ref = this.firestore.collection("commerceSyncState").doc(LOCK_ID);
    await this.firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const lockUntil = snapshot.data()?.lockUntil as Timestamp | undefined;
      if (snapshot.data()?.status === "running" && lockUntil && lockUntil.toMillis() > Date.now())
        throw new PaystackCommerceError("SYNC_RUNNING", "A product synchronization is already running.");
      transaction.set(ref, { status: "running", startedAt: FieldValue.serverTimestamp(), lockUntil: Timestamp.fromMillis(Date.now() + LOCK_TTL_MS), startedBy: uid }, { merge: true });
    });
  }

  async sync(uid: string): Promise<CommerceSyncResult> {
    await this.acquireLock(uid);
    const result: CommerceSyncResult = { created: 0, updated: 0, unchanged: 0, flagged: 0, completedAt: new Date().toISOString() };
    try {
      const remote = await this.storefrontProducts();
      const remoteIds = new Set<string>();
      for (const item of remote) {
        const normalized = normalizePaystackProduct(item, this.storefrontSlug);
        remoteIds.add(normalized.paystackProductId);
        const saved = await this.upsert(normalized);
        if (saved.created) result.created += 1;
        else if (saved.changed) result.updated += 1;
        else result.unchanged += 1;
      }
      const cached = await this.firestore.collection("productsCache").get();
      const batch = this.firestore.batch();
      const missingIds = new Set(missingPaystackProductIds(cached.docs.map((item) => string(item.data().paystackProductId)), [...remoteIds]));
      cached.docs.forEach((item) => {
        if (missingIds.has(string(item.data().paystackProductId))) {
          batch.update(item.ref, { syncStatus: "missing-from-paystack", updatedAt: FieldValue.serverTimestamp() });
          batch.set(this.firestore.collection("productSyncDetails").doc(item.id), { productId: item.id, lastError: "This product is not attached to the configured Paystack Storefront.", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
          result.flagged += 1;
        }
      });
      await batch.commit();
      result.completedAt = new Date().toISOString();
      await this.firestore.collection("commerceSyncState").doc(LOCK_ID).set({ ...result, status: "success", lastSuccessfulSyncAt: FieldValue.serverTimestamp(), completedAt: FieldValue.serverTimestamp(), lockUntil: FieldValue.delete(), lastError: FieldValue.delete() }, { merge: true });
      return result;
    } catch (error) {
      const safeMessage = error instanceof PaystackCommerceError ? error.message : "Product synchronization failed.";
      await this.firestore.collection("commerceSyncState").doc(LOCK_ID).set({ status: "error", completedAt: FieldValue.serverTimestamp(), lockUntil: FieldValue.delete(), lastError: safeMessage }, { merge: true });
      throw error;
    }
  }
}
