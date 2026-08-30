# Paystack Storefront setup

The official Tamlois retail shop is:

```text
https://paystack.shop/tamls
```

The Tamlois website contains a branded `/shop` landing page and three static homepage promotional cards. All three cards currently link directly to:

```text
https://paystack.shop/tamls?product=botanical-scalp-oil-hkxrdj
```

The website does not load, scrape or synchronize a Storefront catalogue at runtime. The homepage card copy is developer-maintained promotional content; Paystack remains authoritative for the product actually offered, its current price and availability.

## Single source of truth

Manage all retail information in Paystack Storefront:

- create, replace and remove products;
- upload product images;
- edit names, descriptions and prices;
- manage variants, availability, stock and discounts;
- configure delivery options;
- review, fulfil and reconcile retail orders.

There is no Tamlois product editor, product-image upload workflow, runtime product cache, retail cart or retail-order dashboard. Changes to the three homepage promotional cards are repository changes; live retail changes remain Paystack Storefront changes.

## Website configuration

`src/config/commerce.ts` owns the default Storefront URL and accepts only HTTPS links on `paystack.shop`. The optional browser-safe override is:

```env
VITE_PAYSTACK_STOREFRONT_URL=https://paystack.shop/tamls
```

This URL is public and is not a credential. If the override is absent, the application safely uses the supplied Tamlois URL. If a supplied override is blank, malformed, non-HTTPS or uses another host, the external button is replaced with a temporary-unavailability message and clinic contact action.

## Separate Paystack integrations

Retail Storefront checkout and appointment payments are separate:

- retail products and orders use Paystack Storefront;
- appointments use Firebase Functions, Paystack Transactions, signed webhooks and server-side verification;
- updating the Storefront URL does not update booking callback URLs, webhook URLs, Secret Manager values, deposits or payment modes;
- no Paystack secret is needed in the browser for Storefront links.

## Launch checklist

1. Open `https://paystack.shop/tamls` and confirm it resolves to the Tamlois Storefront.
2. Review all Storefront product copy and avoid treatment, cure or guaranteed-outcome claims.
3. Confirm current images, prices, variants, stock, discounts and delivery settings in Paystack.
4. Confirm retail order notifications and fulfilment ownership.
5. Test homepage, `/shop`, footer and admin Storefront links on mobile and desktop.
6. Confirm the external link opens in a new tab and the original Tamlois page remains usable.
7. Review Paystack’s standard transaction fees for successful Storefront sales.

No Shopify subscription, collection ID, Storefront access token or product synchronization is required.
