import type { StaticGalleryItem } from "../types";

const asset = (file: string) => `${import.meta.env.BASE_URL}gallery/${file}`;

export const staticGalleryItems: StaticGalleryItem[] = [
  {
    id: "woven-natural-style",
    category: "natural-hair",
    caption: "Woven natural-hair styling with a clean, structured finish.",
    alt: "Close view of a woven natural-hair style with defined twists",
    order: 1,
    featured: true,
    active: true,
    width: 765,
    height: 1280,
    sources: [
      { src: asset("woven-style-480.webp"), width: 480 },
      { src: asset("woven-style-765.webp"), width: 765 },
    ],
    provenance: "tamlois",
    provenanceLabel: "Tamlois salon image",
    isClientResult: false,
    writtenConsentConfirmed: false,
    consentNote:
      "Repository-provided Tamlois salon imagery. Presented as style work, not a client-result or outcome claim.",
    relatedHref: "/booking?category=salon",
  },
  {
    id: "consultation-placeholder",
    category: "trichology",
    caption: "A calm setting for discussing hair and scalp concerns.",
    alt: "Black woman with a natural afro in a consultation setting",
    order: 2,
    featured: true,
    active: true,
    width: 1440,
    height: 2160,
    sources: [
      { src: asset("consultation-480.webp"), width: 480 },
      { src: asset("consultation-960.webp"), width: 960 },
      { src: asset("consultation-1440.webp"), width: 1440 },
    ],
    provenance: "licensed-placeholder",
    provenanceLabel: "Licensed placeholder",
    isClientResult: false,
    writtenConsentConfirmed: false,
    consentNote: "Stock imagery for composition only; not a Tamlois client or result.",
    relatedHref: "/booking?category=trichology",
  },
  {
    id: "natural-hair-placeholder",
    category: "natural-hair",
    caption: "Natural-hair texture presented as editorial inspiration.",
    alt: "Nigerian woman with healthy natural textured hair",
    order: 3,
    featured: false,
    active: true,
    width: 1440,
    height: 1800,
    sources: [
      { src: asset("natural-hair-480.webp"), width: 480 },
      { src: asset("natural-hair-960.webp"), width: 960 },
      { src: asset("natural-hair-1440.webp"), width: 1440 },
    ],
    provenance: "licensed-placeholder",
    provenanceLabel: "Licensed placeholder",
    isClientResult: false,
    writtenConsentConfirmed: false,
    consentNote: "Stock inspiration; not a Tamlois client or verified result.",
    relatedHref: "/booking?category=salon",
  },
  {
    id: "clinic-placeholder",
    category: "clinic",
    caption: "Professional care in a focused salon environment.",
    alt: "Black female hair professional working in a studio",
    order: 4,
    featured: false,
    active: true,
    width: 1440,
    height: 2159,
    sources: [
      { src: asset("clinic-480.webp"), width: 480 },
      { src: asset("clinic-960.webp"), width: 960 },
      { src: asset("clinic-1440.webp"), width: 1440 },
    ],
    provenance: "licensed-placeholder",
    provenanceLabel: "Licensed placeholder",
    isClientResult: false,
    writtenConsentConfirmed: false,
    consentNote: "Stock environment imagery; not the Tamlois clinic or team.",
  },
  {
    id: "confidence-placeholder",
    category: "natural-hair",
    caption: "Natural-hair confidence imagery without an outcome claim.",
    alt: "Smiling Black woman wearing healthy natural textured hair",
    order: 5,
    featured: true,
    active: true,
    width: 1200,
    height: 1500,
    sources: [
      { src: asset("confidence-480.webp"), width: 480 },
      { src: asset("confidence-960.webp"), width: 960 },
      { src: asset("confidence-1200.webp"), width: 1200 },
    ],
    provenance: "licensed-placeholder",
    provenanceLabel: "Licensed placeholder",
    isClientResult: false,
    writtenConsentConfirmed: false,
    consentNote: "Stock inspiration; not a Tamlois client or verified result.",
  },
];

export function validateStaticGallery(items: StaticGalleryItem[]) {
  const invalidResult = items.find(
    (item) => item.isClientResult && !item.writtenConsentConfirmed,
  );
  if (invalidResult)
    throw new Error(
      `${invalidResult.id} cannot be labelled as a client result without confirmed written consent.`,
    );
  return items;
}
