# Shopify setup

The site uses `MockCommerceProvider` until all three Shopify environment values are configured. It then selects `ShopifyCommerceProvider`, loads the published collection through Storefront API 2026-04, and creates a Shopify cart before redirecting to its checkout URL.

## Supported Storefront collection flow

1. Create and confirm clinic products in Shopify.
2. Create a Storefront API public access token with the minimum scopes required for published products and cart creation.
3. Copy the collection GraphQL ID into `VITE_SHOPIFY_BUY_BUTTON_COLLECTION_ID` (the legacy variable name is retained for compatibility).
4. Set `VITE_SHOPIFY_STORE_DOMAIN` and `VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN`.
5. Confirm every published product has an image and at least one available variant.
6. Verify the production domain, currency, delivery, tax, returns and checkout policies.
7. Test collection loading, empty/error/retry states, cart creation and the hosted checkout on the deployed domain.

Never expose Shopify Admin API credentials in frontend code. Storefront configuration intentionally made public to browser clients must still use least privilege.
