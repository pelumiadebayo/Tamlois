# Static gallery developer workflow

The gallery does not use Firestore, Firebase Storage, another upload provider, or admin dashboard edits. The public route is already lazy-loaded at the route boundary in `src/App.tsx`.

## Add or replace an image

1. Confirm who owns the image and whether it is a genuine Tamlois image or a licensed temporary placeholder. Record the licence outside the public site as required by its terms.
2. For a clinic-owned source, place the original in `assets/gallery-sources/`. Files in this directory are input material and are not copied into the Vite production build. Do not place camera originals in `public/`.
3. Add or update the source entry in `scripts/optimize-gallery.mjs`. Use a stable lowercase file ID, practical widths (usually 480, 960 and at most 1200-1440), and a WebP quality near 78-82. Remote placeholder originals are fetched only while the script runs and are not retained.
4. Run:

   ```bash
   npm run gallery:optimize
   ```

5. Inspect the reported dimensions and sizes. Ordinary large variants should normally remain around 100-300 KB where the subject permits. Lower quality slightly or reduce the largest width when a variant is unnecessarily large. Inspect the image visually before accepting it.
6. Add or update the typed record in `src/data/gallery.ts`: intrinsic width/height, every responsive source, caption, meaningful alt text, category, order, featured status, provenance label, related route and consent note.
7. Set `provenance` to `tamlois` only for repository-approved Tamlois media. Keep temporary stock media as `licensed-placeholder` so the public badge is unambiguous.
8. Keep `isClientResult: false` unless the clinic holds confirmed written consent and has supplied honest result context. If it is a client result, set `writtenConsentConfirmed: true` only after that confirmation. The static validation and tests reject an unconsented result label.
9. Remove obsolete generated variants from `public/gallery/` after confirming no typed record or Care Loop reference uses them.

## Remove an image

1. Remove its record from `src/data/gallery.ts`.
2. Remove its entry from `scripts/optimize-gallery.mjs`.
3. Delete only that image's generated files from `public/gallery/` and its local source from `assets/gallery-sources/` when retention is no longer required.
4. Check whether the Care Loop or another page refers to the same optimized asset.

## Verify

Run the gallery tests, application tests and build:

```bash
npm test
npm run build
npm run test:e2e
```

Open `/#/gallery` at approximately 390x844 and 1440x900. Check filtering, Load More, intrinsic image space before loading, placeholder/Tamlois labels, captions, keyboard focus, no horizontal overflow, and that below-fold images use lazy loading. In browser Network tools, confirm the selected `srcset` variant is appropriate for the viewport and no JPEG camera original is requested or included in `dist`.
