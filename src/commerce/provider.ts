import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { products as legacyProducts } from "../data/content";
import { commerceConfig } from "../config/commerce";
import { isSafeProductImageUrl } from "./products";
import { db, firebaseEnabled, functions } from "../lib/firebase";
import type {
  ProductPresentationInput,
  ProductSyncResult,
  ProductSyncState,
  TamloisProduct,
} from "../types";

export interface CommerceProvider {
  readonly isDemo: boolean;
  listPublicProducts(): Promise<TamloisProduct[]>;
  listAdminProducts(): Promise<TamloisProduct[]>;
  getSyncState(): Promise<ProductSyncState | null>;
  importProduct(productUrl: string): Promise<TamloisProduct>;
  syncStorefront(): Promise<ProductSyncResult>;
  refreshProduct(productId: string): Promise<TamloisProduct>;
  refreshAllProducts(): Promise<ProductSyncResult>;
  savePresentation(
    productId: string,
    input: ProductPresentationInput,
  ): Promise<void>;
}

const now = () => new Date().toISOString();
const demoProducts: TamloisProduct[] = legacyProducts.map((product, index) => ({
  id: product.id,
  paystackProductId: `demo-${index + 1}`,
  paystackProductCode: `DEMO_${index + 1}`,
  paystackStorefrontSlug: "tamls",
  paystackProductUrl:
    commerceConfig.knownProductUrls[product.id] ?? commerceConfig.storefrontUrl!,
  sourceName: product.title,
  sourceDescription: product.summary,
  sourcePrice: product.price,
  currency: "NGN",
  sourceImageUrl: product.image,
  sourceAvailable: product.available,
  displayTitle: undefined,
  displaySummary: undefined,
  displayImageUrl: undefined,
  imageAlt: product.imageAlt,
  category: product.category,
  featured: product.featured,
  visible: true,
  displayOrder: index + 1,
  syncStatus: "synced",
  lastSyncedAt: now(),
  createdAt: now(),
  updatedAt: now(),
}));

const DEMO_KEY = "tamlois-products-demo-v1";

export class MockCommerceProvider implements CommerceProvider {
  readonly isDemo: boolean = true;
  private read() {
    try {
      const saved = localStorage.getItem(DEMO_KEY);
      return saved ? (JSON.parse(saved) as TamloisProduct[]) : demoProducts;
    } catch {
      return demoProducts;
    }
  }
  private write(products: TamloisProduct[]) {
    localStorage.setItem(DEMO_KEY, JSON.stringify(products));
  }
  async listPublicProducts() {
    return this.read().filter((product) => product.visible);
  }
  async listAdminProducts() {
    return this.read();
  }
  async getSyncState() {
    return null;
  }
  async importProduct(productUrl: string) {
    const existing = this.read();
    const found = existing.find((product) => product.paystackProductUrl === productUrl);
    if (found) return found;
    const product: TamloisProduct = {
      ...demoProducts[0]!,
      id: `demo-import-${Date.now()}`,
      paystackProductId: `demo-${Date.now()}`,
      paystackProductCode: `DEMO_${Date.now()}`,
      paystackProductUrl: productUrl,
      sourceName: "Imported Paystack product",
      sourceDescription: "Demo preview. Firebase mode resolves live Paystack data.",
      sourceImageUrl: undefined,
      featured: false,
      visible: false,
      displayOrder: existing.length + 1,
      syncStatus: "manual-review",
      createdAt: now(),
      updatedAt: now(),
    };
    this.write([...existing, product]);
    return product;
  }
  async syncStorefront() {
    return { created: 0, updated: this.read().length, unchanged: 0, flagged: 0, completedAt: now() };
  }
  async refreshProduct(productId: string) {
    const product = this.read().find((item) => item.id === productId);
    if (!product) throw new Error("Product not found.");
    return product;
  }
  async refreshAllProducts() {
    return this.syncStorefront();
  }
  async savePresentation(productId: string, input: ProductPresentationInput) {
    if (!isSafeProductImageUrl(input.displayImageUrl ?? ""))
      throw new Error("Display image must be an HTTPS URL.");
    const updated = this.read().map((product) =>
      product.id === productId ? { ...product, ...input, updatedAt: now() } : product,
    );
    this.write(updated);
  }
}

export class PaystackCommerceProvider implements CommerceProvider {
  readonly isDemo = false;
  private requireServices() {
    if (!db || !functions) throw new Error("Firebase commerce is not configured.");
    return { db, functions };
  }
  async listPublicProducts() {
    const services = this.requireServices();
    const snapshot = await getDocs(
      query(collection(services.db, "productsCache"), where("visible", "==", true)),
    );
    return snapshot.docs.map((item) => item.data() as TamloisProduct);
  }
  async listAdminProducts() {
    const services = this.requireServices();
    const [snapshot, errors] = await Promise.all([
      getDocs(collection(services.db, "productsCache")),
      getDocs(collection(services.db, "productSyncDetails")),
    ]);
    const errorById = new Map(errors.docs.map((item) => [item.id, String(item.data().lastError ?? "")]));
    return snapshot.docs.map((item) => ({ ...item.data(), syncError: errorById.get(item.id) || undefined }) as TamloisProduct);
  }
  async getSyncState() {
    const services = this.requireServices();
    const snapshot = await getDoc(doc(services.db, "commerceSyncState", "paystack"));
    return snapshot.exists() ? (snapshot.data() as ProductSyncState) : null;
  }
  private async call<TInput, TResult>(name: string, input: TInput) {
    const services = this.requireServices();
    const callable = httpsCallable<TInput, TResult>(services.functions, name);
    return (await callable(input)).data;
  }
  importProduct(productUrl: string) {
    return this.call<{ productUrl: string }, TamloisProduct>("importPaystackProduct", { productUrl });
  }
  syncStorefront() {
    return this.call<Record<string, never>, ProductSyncResult>("syncPaystackStorefrontProducts", {});
  }
  refreshProduct(productId: string) {
    return this.call<{ productId: string }, TamloisProduct>("refreshPaystackProduct", { productId });
  }
  refreshAllProducts() {
    return this.call<Record<string, never>, ProductSyncResult>("refreshAllPaystackProducts", {});
  }
  async savePresentation(productId: string, input: ProductPresentationInput) {
    const services = this.requireServices();
    if (!isSafeProductImageUrl(input.displayImageUrl ?? ""))
      throw new Error("Display image must be an HTTPS URL.");
    await updateDoc(doc(services.db, "productsCache", productId), {
      ...input,
      updatedAt: serverTimestamp(),
    });
  }
}

class DisabledCommerceProvider extends MockCommerceProvider {
  override readonly isDemo = false;
  override async listPublicProducts() { return []; }
  override async listAdminProducts() { return []; }
  override async importProduct(): Promise<TamloisProduct> { throw new Error("Paystack commerce is disabled."); }
  override async syncStorefront(): Promise<ProductSyncResult> { throw new Error("Paystack commerce is disabled."); }
  override async refreshProduct(): Promise<TamloisProduct> { throw new Error("Paystack commerce is disabled."); }
  override async refreshAllProducts(): Promise<ProductSyncResult> { throw new Error("Paystack commerce is disabled."); }
  override async savePresentation(): Promise<void> { throw new Error("Paystack commerce is disabled."); }
}

export const commerceProvider: CommerceProvider =
  commerceConfig.provider === "disabled"
    ? new DisabledCommerceProvider()
    : firebaseEnabled
      ? new PaystackCommerceProvider()
      : new MockCommerceProvider();
