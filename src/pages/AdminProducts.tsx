import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  Eye,
  EyeOff,
  RefreshCw,
  Search,
  Star,
  Upload,
  X,
} from "lucide-react";
import { ProductCard } from "../components/Cards";
import { commerceProvider } from "../commerce/provider";
import { parsePaystackProductUrl, productTitle } from "../commerce/products";
import { currency } from "../lib/booking";
import type {
  ProductPresentationInput,
  ProductSyncState,
  TamloisProduct,
} from "../types";

const statusOptions = [
  "all",
  "synced",
  "manual-review",
  "sync-error",
  "missing-from-paystack",
] as const;
const dateLabel = (value: unknown) => {
  if (!value) return "Never";
  const date =
    typeof value === "string"
      ? new Date(value)
      : typeof value === "object" && value && "toDate" in value
        ? (value as { toDate(): Date }).toDate()
        : null;
  return date && !Number.isNaN(date.valueOf())
    ? new Intl.DateTimeFormat("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date)
    : "Unknown";
};
const friendlyError = (error: unknown) => {
  const message =
    error instanceof Error ? error.message : "The product operation failed.";
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  if (message.includes("unauthenticated"))
    return "Sign in again to manage products.";
  if (
    code.includes("permission-denied") ||
    message.includes("permission-denied") ||
    message.includes("Missing or insufficient permissions")
  )
    return "Firestore has not authorized access to the product catalogue. Confirm the signed-in owner UID and deploy the updated Firestore Rules.";
  return message;
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<TamloisProduct[]>([]);
  const [syncState, setSyncState] = useState<ProductSyncState | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [visibility, setVisibility] = useState("all");
  const [syncFilter, setSyncFilter] =
    useState<(typeof statusOptions)[number]>("all");
  const [featuredFilter, setFeaturedFilter] = useState("all");
  const [importOpen, setImportOpen] = useState(false);
  const [productUrl, setProductUrl] = useState("");
  const [editing, setEditing] = useState<TamloisProduct | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    setError("");
    try {
      const [items, nextSyncState] = await Promise.all([
        commerceProvider.listAdminProducts(),
        commerceProvider.getSyncState(),
      ]);
      setProducts(items.sort((a, b) => a.displayOrder - b.displayOrder));
      setSyncState(nextSyncState);
      setState("ready");
    } catch (nextError) {
      setError(friendlyError(nextError));
      setState("error");
    }
  }, []);
  useEffect(() => void load(), [load]);

  const filtered = useMemo(
    () =>
      products.filter((product) => {
        const term = query.trim().toLowerCase();
        return (
          (!term ||
            `${productTitle(product)} ${product.paystackProductCode} ${product.category ?? ""}`
              .toLowerCase()
              .includes(term)) &&
          (visibility === "all" || String(product.visible) === visibility) &&
          (syncFilter === "all" || product.syncStatus === syncFilter) &&
          (featuredFilter === "all" ||
            String(product.featured) === featuredFilter)
        );
      }),
    [products, query, visibility, syncFilter, featuredFilter],
  );

  async function run(
    action: string,
    task: () => Promise<unknown>,
    success: string,
  ) {
    setBusy(action);
    setError("");
    setNotice("");
    try {
      await task();
      setNotice(success);
      await load();
    } catch (nextError) {
      setError(friendlyError(nextError));
    } finally {
      setBusy("");
    }
  }

  async function importProduct(event: React.FormEvent) {
    event.preventDefault();
    const parsed = parsePaystackProductUrl(productUrl);
    if (!parsed || parsed.storefrontSlug !== "tamls") {
      setError("Enter an HTTPS product link from paystack.shop/tamls.");
      return;
    }
    await run(
      "import",
      async () => {
        const product = await commerceProvider.importProduct(productUrl);
        setImportOpen(false);
        setProductUrl("");
        setEditing(product);
      },
      "Product imported as hidden. Review its preview and publish when ready.",
    );
  }

  async function quickSave(
    product: TamloisProduct,
    change: Partial<ProductPresentationInput>,
  ) {
    const input: ProductPresentationInput = {
      displayTitle: product.displayTitle ?? "",
      displaySummary: product.displaySummary ?? "",
      displayImageUrl: product.displayImageUrl ?? "",
      imageAlt: product.imageAlt || product.sourceName,
      category: product.category ?? "",
      featured: product.featured,
      visible: product.visible,
      displayOrder: product.displayOrder,
      ...change,
    };
    await run(
      `save-${product.id}`,
      () => commerceProvider.savePresentation(product.id, input),
      "Product display settings saved.",
    );
  }

  return (
    <>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-4xl text-[var(--forest-950)]">
            Products
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Paystack controls price, stock and primary details. Tamlois controls
            presentation.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="btn btn-secondary"
            disabled={Boolean(busy)}
            onClick={() =>
              void run(
                "refresh-all",
                () => commerceProvider.refreshAllProducts(),
                "All products refreshed.",
              )
            }
          >
            <RefreshCw size={17} />
            Refresh all
          </button>
          <button
            className="btn btn-commerce"
            disabled={Boolean(busy)}
            onClick={() =>
              void run(
                "sync",
                () => commerceProvider.syncStorefront(),
                "Storefront synchronization completed.",
              )
            }
          >
            <RefreshCw size={17} />
            Sync Storefront
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setImportOpen(true)}
          >
            <Upload size={17} />
            Import product
          </button>
        </div>
      </div>
      {commerceProvider.isDemo && (
        <p
          className="mb-5 rounded-[12px] bg-[var(--color-state-warning-surface)] p-4 text-sm text-[var(--color-state-warning)]"
          role="status"
        >
          <strong>Demo data:</strong> switch to Firebase mode and deploy the
          product Functions for live Paystack synchronization.
        </p>
      )}
      {notice && (
        <p
          className="mb-5 rounded-[12px] bg-[var(--forest-50)] p-4 text-sm font-semibold text-[var(--forest-800)]"
          role="status"
        >
          {notice}
        </p>
      )}
      {error && !importOpen && (
        <div
          className="mb-5 rounded-[12px] bg-[var(--color-state-error-surface)] p-4 text-sm text-[var(--color-state-error)]"
          role="alert"
        >
          <p>{error}</p>
          <button
            className="mt-2 font-bold underline"
            onClick={() => void load()}
          >
            Retry
          </button>
        </div>
      )}
      <section
        className="surface p-5"
        aria-label="Product synchronization status"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.12em] text-[var(--forest-700)]">
              Last successful sync
            </p>
            <p className="mt-1 font-semibold">
              {dateLabel(syncState?.lastSuccessfulSyncAt)}
            </p>
          </div>
          {syncState && (
            <p className="text-sm text-[var(--muted)]">
              {syncState.created} created · {syncState.updated} updated ·{" "}
              {syncState.unchanged} unchanged · {syncState.flagged} flagged
            </p>
          )}
        </div>
        {syncState?.lastError && (
          <p className="mt-4 text-sm text-[var(--color-state-error)]">
            Last error: {syncState.lastError}
          </p>
        )}
      </section>
      <div className="surface mt-5 grid gap-3 p-4 lg:grid-cols-[1fr_180px_200px_170px]">
        <label className="relative">
          <span className="sr-only">Search products</span>
          <Search
            size={17}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]"
          />
          <input
          className="control"
          style={{ paddingLeft: "2.75rem" }}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name or code"
          />
        </label>
        <select
          aria-label="Visibility"
          className="control"
          value={visibility}
          onChange={(event) => setVisibility(event.target.value)}
        >
          <option value="all">All visibility</option>
          <option value="true">Visible</option>
          <option value="false">Hidden</option>
        </select>
        <select
          aria-label="Sync status"
          className="control"
          value={syncFilter}
          onChange={(event) =>
            setSyncFilter(event.target.value as typeof syncFilter)
          }
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status === "all" ? "All sync statuses" : status}
            </option>
          ))}
        </select>
        <select
          aria-label="Featured status"
          className="control"
          value={featuredFilter}
          onChange={(event) => setFeaturedFilter(event.target.value)}
        >
          <option value="all">All products</option>
          <option value="true">Featured</option>
          <option value="false">Not featured</option>
        </select>
      </div>
      {state === "loading" && (
        <p className="surface mt-5 p-6" role="status">
          Loading products…
        </p>
      )}
      {state === "ready" && products.length === 0 && (
        <section className="surface mt-5 p-8 text-center">
          <h2 className="font-display text-3xl">No products imported</h2>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Import one product link or synchronize the full Tamlois Storefront.
          </p>
        </section>
      )}
      {state === "ready" && products.length > 0 && filtered.length === 0 && (
        <p className="surface mt-5 p-6">No products match these filters.</p>
      )}
      {state === "ready" && filtered.length > 0 && (
        <>
          <div className="mt-5 grid gap-4 md:hidden">
            {filtered.map((product) => (
              <article key={product.id} className="surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <strong>{productTitle(product)}</strong>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {product.paystackProductCode}
                    </p>
                  </div>
                  <span className="status">{product.syncStatus}</span>
                </div>
                <p className="mt-4 text-sm">
                  {currency(product.sourcePrice)} ·{" "}
                  {product.sourceAvailable ? "Available" : "Unavailable"}
                </p>
                {product.syncError && <p className="mt-2 text-xs text-[#8f302f]">{product.syncError}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    aria-label={`${product.visible ? "Hide" : "Show"} ${productTitle(product)}`}
                    className="btn btn-secondary"
                    disabled={Boolean(busy)}
                    onClick={() =>
                      void quickSave(product, { visible: !product.visible })
                    }
                  >
                    {product.visible ? <EyeOff size={16} /> : <Eye size={16} />}
                    {product.visible ? "Hide" : "Show"}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setEditing(product)}
                  >
                    Edit
                  </button>
                  <button
                    aria-label={`Refresh ${productTitle(product)}`}
                    className="btn btn-secondary"
                    disabled={Boolean(busy)}
                    onClick={() =>
                      void run(
                        `refresh-${product.id}`,
                        () => commerceProvider.refreshProduct(product.id),
                        `${productTitle(product)} refreshed.`,
                      )
                    }
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="surface mt-5 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-[var(--forest-50)] text-xs text-[var(--muted)]">
                <tr>
                  <th className="p-4">Product</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Availability</th>
                  <th className="p-4">Order</th>
                  <th className="p-4">Visibility</th>
                  <th className="p-4">Sync</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr
                    key={product.id}
                    className="border-t border-[var(--line)]"
                  >
                    <td className="p-4">
                      <strong>{productTitle(product)}</strong>
                      <span className="mt-1 block text-xs text-[var(--muted)]">
                        {product.paystackProductCode}
                      </span>
                    </td>
                    <td className="p-4">{currency(product.sourcePrice)}</td>
                    <td className="p-4">
                      {product.sourceAvailable ? "Available" : "Unavailable"}
                    </td>
                    <td className="p-4 tabular-nums">{product.displayOrder}</td>
                    <td className="p-4">
                      <button
                        aria-label={`${product.visible ? "Hide" : "Show"} ${productTitle(product)}`}
                        disabled={Boolean(busy)}
                        onClick={() =>
                          void quickSave(product, { visible: !product.visible })
                        }
                        className="inline-flex items-center gap-2 font-bold text-[var(--forest-800)]"
                      >
                        {product.visible ? (
                          <Eye size={16} />
                        ) : (
                          <EyeOff size={16} />
                        )}
                        {product.visible ? "Visible" : "Hidden"}
                      </button>
                      {product.featured && (
                        <span className="ml-3 inline-flex items-center gap-1 text-xs">
                          <Star size={14} />
                          Featured
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="status">{product.syncStatus}</span>
                        <span className="mt-1 block text-xs text-[var(--muted)]">
                          {dateLabel(product.lastSyncedAt)}
                        </span>
                        {product.syncError && <span className="mt-1 block max-w-52 text-xs text-[#8f302f]">{product.syncError}</span>}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          className="font-bold text-[var(--forest-800)]"
                          onClick={() => setEditing(product)}
                        >
                          Edit
                        </button>
                        <button
                          aria-label={`Refresh ${productTitle(product)}`}
                          disabled={Boolean(busy)}
                          onClick={() =>
                            void run(
                              `refresh-${product.id}`,
                              () => commerceProvider.refreshProduct(product.id),
                              `${productTitle(product)} refreshed.`,
                            )
                          }
                        >
                          <RefreshCw size={17} />
                        </button>
                        <a
                          href={product.paystackProductUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Edit ${productTitle(product)} in Paystack`}
                        >
                          <ExternalLink size={17} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {importOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[rgba(9,35,26,.58)] p-4"
          role="presentation"
          onKeyDown={(event) => {
            if (event.key === "Escape") setImportOpen(false);
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setImportOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-title"
            className="surface w-full max-w-xl p-6"
          >
            <div className="flex justify-between gap-4">
              <div>
                <h2 id="import-title" className="font-display text-3xl">
                  Import Paystack product
                </h2>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Paste a product link from paystack.shop/tamls. It will remain
                  hidden until you review and publish it.
                </p>
              </div>
              <button
                className="grid size-11 place-items-center"
                aria-label="Close import dialog"
                onClick={() => setImportOpen(false)}
              >
                <X />
              </button>
            </div>
            <form
              className="mt-6"
              onSubmit={(event) => void importProduct(event)}
            >
              <label className="field">
                <span>Paystack product URL (required)</span>
                <input
                  autoFocus
                  required
                  type="url"
                  className="control"
                  value={productUrl}
                  onChange={(event) => setProductUrl(event.target.value)}
                  placeholder="https://paystack.shop/tamls?product=…"
                />
              </label>
              {error && (
                <p className="mt-3 text-sm text-[#8f302f]" role="alert">
                  {error}
                </p>
              )}
              <button
                className="btn btn-primary mt-5"
                disabled={busy === "import"}
              >
                {busy === "import" ? "Importing…" : "Import and preview"}
              </button>
            </form>
          </section>
        </div>
      )}
      {editing && (
        <ProductEditor
          product={editing}
          busy={Boolean(busy)}
          onClose={() => setEditing(null)}
          onSave={(input) =>
            run(
              `save-${editing.id}`,
              async () => {
                await commerceProvider.savePresentation(editing.id, input);
                setEditing(null);
              },
              "Product display settings saved.",
            )
          }
        />
      )}
    </>
  );
}

function ProductEditor({
  product,
  busy,
  onClose,
  onSave,
}: {
  product: TamloisProduct;
  busy: boolean;
  onClose(): void;
  onSave(input: ProductPresentationInput): Promise<void>;
}) {
  const defaults: ProductPresentationInput = {
    displayTitle: product.displayTitle ?? "",
    displaySummary: product.displaySummary ?? "",
    displayImageUrl: product.displayImageUrl ?? "",
    imageAlt: product.imageAlt || product.sourceName,
    category: product.category ?? "",
    featured: product.featured,
    visible: product.visible,
    displayOrder: product.displayOrder,
  };
  const [input, setInput] = useState(defaults);
  const preview = { ...product, ...input };
  const set = <K extends keyof ProductPresentationInput>(
    key: K,
    value: ProductPresentationInput[K],
  ) => setInput((current) => ({ ...current, [key]: value }));
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(9,35,26,.58)] p-4 md:p-8">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-editor-title"
        className="surface mx-auto max-w-5xl p-5 md:p-7"
      >
        <div className="flex justify-between gap-4">
          <div>
            <h2 id="product-editor-title" className="font-display text-3xl">
              Product display
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Price, stock and primary details remain managed in Paystack.
            </p>
          </div>
          <button
            className="grid size-11 place-items-center"
            aria-label="Close product editor"
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_320px]">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void onSave(input);
            }}
            className="grid gap-5"
          >
            <label className="field">
              <span>Homepage title override</span>
              <input
                className="control"
                value={input.displayTitle}
                onChange={(event) => set("displayTitle", event.target.value)}
                placeholder={product.sourceName}
              />
            </label>
            <label className="field">
              <span>Short description override</span>
              <textarea
                value={input.displaySummary}
                onChange={(event) => set("displaySummary", event.target.value)}
                placeholder={product.sourceDescription}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="field">
                <span>Category</span>
                <input
                  className="control"
                  value={input.category}
                  onChange={(event) => set("category", event.target.value)}
                />
              </label>
              <label className="field">
                <span>Display order</span>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  className="control"
                  value={input.displayOrder}
                  onChange={(event) =>
                    set("displayOrder", Number(event.target.value))
                  }
                />
              </label>
            </div>
            <label className="field">
              <span>Display image URL</span>
              <input
                type="url"
                className="control"
                value={input.displayImageUrl}
                onChange={(event) => set("displayImageUrl", event.target.value)}
                placeholder="Optional HTTPS image override"
              />
            </label>
            <label className="field">
              <span>Image alt text (required)</span>
              <input
                required
                className="control"
                value={input.imageAlt}
                onChange={(event) => set("imageAlt", event.target.value)}
              />
            </label>
            <div className="flex flex-wrap gap-5">
              <label className="flex items-center gap-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  className="size-5 accent-[var(--forest-800)]"
                  checked={input.visible}
                  onChange={(event) => set("visible", event.target.checked)}
                />
                Visible on website
              </label>
              <label className="flex items-center gap-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  className="size-5 accent-[var(--forest-800)]"
                  checked={input.featured}
                  onChange={(event) => set("featured", event.target.checked)}
                />
                Featured on homepage
              </label>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? "Saving…" : "Save display settings"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() =>
                  setInput({
                    ...defaults,
                    displayTitle: "",
                    displaySummary: "",
                    displayImageUrl: "",
                    imageAlt: product.sourceName,
                    category: "",
                  })
                }
              >
                Reset overrides
              </button>
              <a
                href={product.paystackProductUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                Edit in Paystack <ExternalLink size={16} />
              </a>
            </div>
          </form>
          <aside>
            <p className="mb-3 text-xs font-bold uppercase tracking-[.12em] text-[var(--forest-700)]">
              Preview
            </p>
            <ProductCard product={preview} sourcePage="admin" />
            <p className="mt-5 text-xs leading-5 text-[var(--muted)]">
              {product.sourceImageUrl
                ? "Using media returned by Paystack unless overridden."
                : "Paystack returned no usable media URL. The Tamlois fallback is shown unless you provide an override."}
            </p>
          </aside>
        </div>
      </section>
    </div>
  );
}
