# Paystack Storefront product integration

The official Tamlois retail shop is `https://paystack.shop/tamls`. Paystack is the source of truth for product identity, primary name/description, price, currency, availability and checkout. Firestore is a safe display cache; it is not a second stock or pricing system.

Reference: [Paystack Storefront API](https://paystack.com/docs/api/storefront/) and [Paystack Product API](https://paystack.com/docs/api/product/).

## Configure and deploy

The website needs only browser-safe values:

```dotenv
VITE_COMMERCE_PROVIDER=paystack
VITE_PAYSTACK_STOREFRONT_URL=https://paystack.shop/tamls
```

Store the secret in Firebase Secret Manager, never `.env`, a `VITE_*` variable, Firestore or GitHub Pages output:

```bash
firebase functions:secrets:set PAYSTACK_SECRET_KEY
firebase deploy --only functions:importPaystackProduct,functions:syncPaystackStorefrontProducts,functions:refreshPaystackProduct,functions:refreshAllPaystackProducts
firebase deploy --only firestore:rules,firestore:indexes
```

`PAYSTACK_STOREFRONT_SLUG` defaults to `tamls`. If it must be changed, set the Firebase string parameter when prompted during Functions deployment. Use a test secret in a test Firebase project first. Rotate a key by running the secret command again, deploy the four product Functions, verify a sync, then revoke the old key in Paystack.

Firebase Functions require a billing-enabled project even when usage remains within an allowance. Configure budget alerts before deployment.

## First synchronization

1. Sign in with the configured owner UID.
2. Open **Admin → Products**.
3. Select **Sync Storefront**.
4. Review newly cached products. New sync records are hidden and not featured by default.
5. Open **Edit**, set category, alt text and any presentation overrides, then enable **Visible on website** and optionally **Featured on homepage**.

The sync paginates the official Storefront endpoint, resolves full Product records, updates Paystack-controlled fields, preserves Tamlois overrides and marks missing items `missing-from-paystack`. It never automatically deletes cached products. An expiring Firestore lock prevents overlapping full syncs. A failed sync leaves last-known-good public records intact.

To import one item, choose **Import product** and paste an HTTPS URL shaped like `https://paystack.shop/tamls?product=product-slug`. Links from other hosts or Storefronts are rejected. The Function confirms the item is attached to the configured Storefront and uses its deterministic Paystack ID as duplicate protection. Imported items remain hidden until reviewed.

## Field ownership

Edit in Paystack: primary name and description, price, currency, active/stock state, product details and checkout settings. Use **Edit in Paystack**, then refresh that product or run a full sync.

Edit in Tamlois Admin: visible, featured, display order, website category, display-title override, short-summary override, display-image URL and alt text. Resetting overrides returns title, description and image selection to Paystack-derived values.

Public pages read only `productsCache` documents where `visible == true`. Homepage additionally selects `featured == true`; `/shop` supports search, category and featured filters. Checkout always opens the cached Paystack product URL in a new tab. There is no local retail cart or order-management system.

## Image behavior

Cards use: Tamlois image override → safe HTTPS media URL returned by Paystack → `/media/product-fallback.svg`. The current official Product API documentation does not guarantee a product-image field. The normalizer accepts common safe media fields when the actual account response supplies them, but the feature must not be represented as verified until the owner runs a real sync. If admin reports that no Paystack media was returned, add an optional HTTPS display-image URL.

## Troubleshooting

- **Unauthorized:** confirm the signed-in Firebase UID matches `OWNER_UID` in `functions/src/domain.ts`, `ownerUid()` in `firestore.rules`, and `VITE_FIREBASE_ADMIN_UID` for frontend feedback.
- **Storefront not found:** confirm the secret belongs to the Paystack business that owns `tamls` and the Storefront is active.
- **Product link cannot be resolved:** confirm it belongs to `tamls` and remains attached to that Storefront. HTML scraping is intentionally not used.
- **Sync already running:** wait up to five minutes for the lock to expire, then retry.
- **Old data remains after an API error:** expected last-known-good behavior; admin displays the last error and successful-sync time.
- **Disable safely:** set `VITE_COMMERCE_PROVIDER=disabled`, rebuild the frontend and leave cached records untouched. Re-enable and sync when ready.

An optional scheduled sync can later call the same service from a scheduled Function, but none is enabled because scheduling can introduce paid infrastructure.
