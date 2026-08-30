import type {
  Concern,
  IntakeQuestion,
  HomeOffering,
  Product,
  Service,
  ServiceExtra,
} from "../types";

export const media = {
  hero: {
    src: "https://images.pexels.com/photos/34589615/pexels-photo-34589615/free-photo-of-portrait-of-woman-with-natural-hair-in-nigeria.jpeg?auto=compress&cs=tinysrgb&w=1400",
    alt: "Nigerian woman with natural textured hair, licensed placeholder portrait",
  },
  practitioner: {
    src: "https://images.pexels.com/photos/30270932/pexels-photo-30270932/free-photo-of-professional-hair-stylist-in-new-orleans-studio.jpeg?auto=compress&cs=tinysrgb&w=1100",
    alt: "Black female hair professional in a studio, licensed placeholder for Popoola Adebola Opeyemi",
  },
  consultation: {
    src: "https://images.pexels.com/photos/7622719/pexels-photo-7622719.jpeg?auto=compress&cs=tinysrgb&w=1200",
    alt: "Black woman with a full natural afro, licensed placeholder for hair and scalp services",
  },
  results: {
    src: "https://images.pexels.com/photos/14152610/pexels-photo-14152610.jpeg?auto=compress&cs=tinysrgb&w=1200",
    alt: "Smiling Black woman with healthy natural textured hair, licensed placeholder result image",
  },
} as const;

export const homeOfferings: HomeOffering[] = [
  {
    id: "trichology",
    sequence: 2,
    eyebrow: "Trichology Care",
    title: "Clinical insight for healthier hair and scalp",
    description:
      "Personalised consultations, scalp analysis and evidence-informed care for shedding, thinning, scalp discomfort and hair-loss concerns.",
    primaryCta: {
      label: "Book a trichology consultation",
      href: "/booking?category=trichology",
    },
    secondaryCta: {
      label: "Explore trichology services",
      href: "/services?category=trichology",
    },
    image: {
      src: media.consultation.src,
      alt: "Black woman in a calm hair and scalp consultation setting, licensed placeholder",
      focalPoint: "center 32%",
      placeholder: true,
    },
    theme: {
      backgroundToken: "forest-950",
      foregroundToken: "paper",
      accentToken: "forest-100",
    },
    active: true,
  },
  {
    id: "salon",
    sequence: 1,
    eyebrow: "Natural Hair Salon",
    title: "Professional care & styling for natural hair",
    description:
      "Scalp-conscious salon services, hydration care and healthy-hair treatments & styling for textured and natural hair.",
    primaryCta: {
      label: "Book a salon service",
      href: "/booking?category=salon",
    },
    secondaryCta: {
      label: "Explore salon services",
      href: "/services?category=salon",
    },
    image: {
      src: media.hero.src,
      alt: "Nigerian woman with healthy natural textured hair, licensed placeholder",
      focalPoint: "center 28%",
      placeholder: true,
    },
    theme: {
      backgroundToken: "cream",
      foregroundToken: "forest-950",
      accentToken: "forest-800",
    },
    active: true,
  },
  {
    id: "products",
    sequence: 3,
    eyebrow: "Hair & Scalp Products",
    title: "Shop our Hair and Scalp Care Products",
    description:
      "Visit the official Tamlois Storefront for current hair and scalp-care products that support consistent routines at home.",
    primaryCta: { label: "Shop hair and scalp care", href: "/shop" },
    secondaryCta: { label: "About the official store", href: "/shop" },
    image: {
      src: "https://images.pexels.com/photos/30595022/pexels-photo-30595022.jpeg?auto=compress&cs=tinysrgb&w=1400",
      alt: "Refined hair-care product arrangement, licensed placeholder",
      focalPoint: "center 52%",
      placeholder: true,
    },
    theme: {
      backgroundToken: "forest-50",
      foregroundToken: "forest-950",
      accentToken: "warm",
    },
    active: true,
  },
  {
    id: "gallery",
    sequence: 4,
    eyebrow: "Gallery & Results",
    title: "Explore our Gallery",
    description:
      "Care made visible, with honest context. Explore care environments and healthy-hair inspiration, including woven African natural-hair styling.",
    primaryCta: { label: "Explore the gallery", href: "/gallery" },
    secondaryCta: { label: "View client stories", href: "/results" },
    image: {
      src: `${import.meta.env.BASE_URL}gallery/woven-style-765.webp`,
      alt: "Woven natural hairstyle with neatly sectioned twists",
      focalPoint: "center 34%",
      placeholder: false,
    },
    theme: {
      backgroundToken: "paper",
      foregroundToken: "forest-950",
      accentToken: "forest-700",
    },
    active: true,
  },
];

const serviceImage = media.consultation.src;
const baseService = {
  preparation:
    "Placeholder guidance: arrive with your scalp accessible and avoid applying heavy oils for 24 hours.",
  expectation:
    "A structured discussion, visual assessment and personalised care recommendation within the booked scope.",
  aftercare:
    "Placeholder guidance: follow the written care plan and contact the clinic if unexpected irritation occurs.",
  caution:
    "This service does not replace medical diagnosis. Disclose allergies, pregnancy, medication and active scalp conditions before treatment.",
  active: true,
  image: serviceImage,
  imageAlt: "Professional hair and scalp consultation, placeholder image",
  placeholder: true as const,
};

export const services: Service[] = [
  {
    ...baseService,
    id: "svc-consult",
    slug: "trichology-consultation",
    name: "Trichology consultation",
    category: "trichology",
    type: "consultation",
    featured: true,
    intakeSchemaId: "intake-trichology",
    photoUploadEnabled: true,
    summary:
      "A focused review of your hair history, scalp concerns and current routine.",
    description:
      "This placeholder consultation record models the clinic’s first-line assessment. It gathers relevant history, observes the scalp and hair, and sets out suitable next steps without making an online diagnosis.",
    concerns: ["shedding", "thinning", "scalp discomfort", "breakage"],
    price: 25000,
    duration: 60,
    consultationRequired: false,
    depositRequired: true,
    depositAmount: 10000,
    order: 2,
    variations: [
      { id: "first", name: "First consultation", price: 25000, duration: 60 },
      { id: "follow", name: "Follow-up review", price: 18000, duration: 45 },
    ],
  },
  {
    ...baseService,
    id: "svc-analysis",
    slug: "scalp-analysis",
    name: "Scalp analysis",
    category: "trichology",
    type: "service",
    intakeSchemaId: "intake-trichology",
    photoUploadEnabled: true,
    summary:
      "A close, non-invasive look at visible scalp and hair characteristics.",
    description:
      "A structured visual review using appropriate magnification where available. Findings are explained in plain language and used to guide a consultation or care recommendation.",
    concerns: ["flaking", "itching", "oiliness", "scalp build-up"],
    price: 18000,
    duration: 45,
    consultationRequired: true,
    depositRequired: true,
    depositAmount: 8000,
    order: 1,
    variations: [],
  },
  {
    ...baseService,
    id: "svc-therapy",
    slug: "scalp-therapy",
    name: "Scalp therapy",
    category: "trichology",
    type: "service",
    intakeSchemaId: "intake-trichology",
    summary: "A clinic-guided cleansing and soothing scalp-care session.",
    description:
      "A placeholder treatment pathway selected after assessment. The session may include cleansing, gentle scalp care and guidance suited to the client’s visible needs and disclosed sensitivities.",
    concerns: ["dryness", "flaking", "build-up"],
    price: 30000,
    duration: 75,
    consultationRequired: true,
    depositRequired: true,
    depositAmount: 12000,
    order: 3,
    variations: [
      { id: "standard", name: "Standard therapy", price: 30000, duration: 75 },
      { id: "extended", name: "Extended therapy", price: 38000, duration: 105 },
    ],
  },
  {
    ...baseService,
    id: "svc-loss",
    slug: "hair-loss-management",
    name: "Hair-loss management",
    category: "trichology",
    type: "service",
    intakeSchemaId: "intake-trichology",
    photoUploadEnabled: true,
    summary:
      "Ongoing review and support for a personalised hair-loss care plan.",
    description:
      "A follow-up service for clients who have completed an initial consultation. It documents changes, reviews adherence and adjusts non-medical care recommendations where appropriate.",
    concerns: ["shedding", "thinning", "patchy appearance"],
    price: 22000,
    duration: 50,
    consultationRequired: true,
    depositRequired: true,
    depositAmount: 10000,
    order: 4,
    variations: [],
  },
  {
    ...baseService,
    id: "svc-treatment",
    slug: "hair-treatments",
    name: "Hair treatments",
    category: "salon",
    type: "service",
    featured: true,
    intakeSchemaId: "intake-salon",
    summary:
      "A moisture and strength-focused session for fragile or breakage-prone hair.",
    description:
      "A placeholder salon treatment selected around the hair’s current condition. It focuses on careful handling, moisture balance and a practical home-care routine.",
    concerns: ["breakage", "dryness", "weak hair"],
    price: 28000,
    duration: 90,
    consultationRequired: false,
    depositRequired: true,
    depositAmount: 10000,
    order: 5,
    variations: [],
  },
  {
    ...baseService,
    id: "svc-natural",
    slug: "natural-hair-care",
    name: "Natural hair care & styling",
    category: "salon",
    type: "service",
    intakeSchemaId: "intake-salon",
    summary:
      "A calm wash session for textured natural hair, plus styling.",
    description:
      "A placeholder maintenance service built around gentle handling, detangling, moisture and a manageable routine. Final inclusions must be confirmed by the clinic.",
    concerns: ["maintenance", "dryness", "tangling"],
    price: 24000,
    duration: 120,
    consultationRequired: false,
    depositRequired: true,
    depositAmount: 10000,
    order: 6,
    variations: [],
  },
  {
    ...baseService,
    id: "svc-salon-demo",
    slug: "demo-salon-booking",
    name: "Demo Salon booking",
    category: "salon",
    type: "service",
    intakeSchemaId: "intake-salon",
    summary:
      "A placeholder Salon service for testing the calendar and session-capacity flow.",
    description:
      "This test-only service lets reviewers complete the Salon booking journey. It is not confirmed clinic inventory and does not describe a real treatment package.",
    concerns: ["booking-flow test"],
    price: 15000,
    duration: 60,
    consultationRequired: false,
    depositRequired: true,
    depositAmount: 7500,
    active: false,
    order: 7,
    variations: [],
  },
  {
    ...baseService,
    id: "pkg-reset",
    slug: "healthy-scalp-reset",
    name: "Healthy Scalp Reset",
    category: "trichology",
    type: "package",
    featured: true,
    intakeSchemaId: "intake-trichology",
    photoUploadEnabled: true,
    summary:
      "A placeholder combination of consultation, scalp analysis and one therapy session.",
    description:
      "A staged starter package for clients who want assessment and an initial clinic care session. Package order and suitability are confirmed after consultation.",
    concerns: ["flaking", "itching", "build-up"],
    price: 62000,
    duration: 150,
    consultationRequired: false,
    depositRequired: true,
    depositAmount: 25000,
    order: 8,
    variations: [],
  },
  {
    ...baseService,
    id: "svc-hidden",
    slug: "seasonal-scalp-session",
    name: "Seasonal scalp session",
    category: "trichology",
    type: "service",
    summary:
      "Inactive placeholder service used to demonstrate catalogue visibility controls.",
    description: "Hidden demo record.",
    concerns: [],
    price: 15000,
    duration: 45,
    consultationRequired: false,
    depositRequired: false,
    depositAmount: 0,
    active: false,
    order: 99,
    variations: [],
  },
];

export const serviceExtras: ServiceExtra[] = [
  {
    id: "extra-wig-installation",
    name: "Wig Installation Service",
    description:
      "A placeholder wig installation add-on for compatible Salon appointments.",
    price: 2000,
    duration: 30,
    compatibleServiceIds: ["svc-treatment", "svc-natural"],
    incompatibleExtraIds: [],
    active: true,
    order: 1,
    placeholder: true,
  },
  {
    id: "extra-clay-detox",
    name: "Clay detox",
    description:
      "A placeholder clay-based cleansing add-on for compatible Salon appointments.",
    price: 8500,
    duration: 30,
    compatibleServiceIds: ["svc-treatment", "svc-natural"],
    incompatibleExtraIds: [],
    active: true,
    order: 2,
    placeholder: true,
  },
  {
    id: "extra-analysis",
    name: "Magnified scalp images",
    description:
      "Appointment-only reference images used to support the in-clinic discussion.",
    price: 8000,
    duration: 15,
    compatibleServiceIds: ["svc-consult", "svc-analysis", "svc-loss"],
    incompatibleExtraIds: [],
    active: true,
    order: 3,
    placeholder: true,
  },
  {
    id: "extra-plan",
    name: "Printed care-plan review",
    description:
      "Extra appointment time to walk through a written routine and questions.",
    price: 4000,
    duration: 15,
    compatibleServiceIds: ["svc-consult", "svc-loss", "svc-therapy"],
    incompatibleExtraIds: [],
    active: true,
    order: 4,
    placeholder: true,
  },
  {
    id: "extra-hair-trims",
    name: "Hair Trims",
    description:
      "A placeholder trim add-on for compatible Salon appointments.",
    price: 5000,
    duration: 15,
    compatibleServiceIds: ["svc-treatment", "svc-natural"],
    incompatibleExtraIds: [],
    active: true,
    order: 5,
    placeholder: true,
  },
];

export const intakeQuestions: IntakeQuestion[] = [
  {
    id: "intake-scalp-state",
    schemaId: "intake-trichology",
    label:
      "Is your scalp currently painful, bleeding or showing signs of infection?",
    helpText:
      "Urgent or severe symptoms may need medical care before a clinic appointment.",
    type: "yes-no",
    required: false,
    order: 1,
    active: true,
  },
  {
    id: "intake-medical-review",
    schemaId: "intake-trichology",
    label: "Have you discussed this concern with a doctor or dermatologist?",
    type: "single-choice",
    options: ["Yes", "No", "Appointment booked"],
    required: false,
    order: 2,
    active: true,
  },
  {
    id: "intake-diagnosis",
    schemaId: "intake-trichology",
    label: "Share any relevant diagnosis or clinician guidance",
    type: "long-text",
    required: false,
    condition: { questionId: "intake-medical-review", equals: "Yes" },
    order: 3,
    active: true,
  },
  {
    id: "intake-chemical",
    schemaId: "intake-salon",
    label:
      "Have you used relaxer, colour or another chemical service in the last 8 weeks?",
    type: "yes-no",
    required: false,
    order: 1,
    active: true,
  },
  {
    id: "intake-sensitivity",
    schemaId: "intake-salon",
    label: "List allergies or product sensitivities we should know about",
    type: "short-text",
    required: false,
    order: 2,
    active: true,
  },
];

export const concerns: Concern[] = [
  [
    "hair-shedding-and-thinning",
    "Hair shedding and thinning",
    "Changes in density, part width or daily shedding can feel unsettling.",
    [
      "more hair than usual during washing",
      "a wider-looking part",
      "reduced fullness",
    ],
    [
      "stress or illness",
      "nutrition changes",
      "traction or handling",
      "hormonal or medical factors",
    ],
    ["svc-consult", "svc-loss"],
  ],
  [
    "dry-itchy-or-flaky-scalp",
    "Dry, itchy or flaky scalp",
    "Persistent discomfort or flakes deserve careful assessment rather than guesswork.",
    ["visible flakes", "itching or tightness", "product build-up"],
    [
      "irritation",
      "product sensitivity",
      "dryness",
      "a condition requiring medical review",
    ],
    ["svc-analysis", "svc-therapy"],
  ],
  [
    "breakage-and-weak-hair",
    "Breakage and weak hair",
    "Short broken strands and difficulty retaining length can have several contributing factors.",
    ["short uneven strands", "knots and tangles", "rough or brittle feel"],
    [
      "heat or chemical stress",
      "mechanical tension",
      "moisture imbalance",
      "handling practices",
    ],
    ["svc-consult", "svc-treatment"],
  ],
  [
    "slow-or-inconsistent-growth",
    "Slow or inconsistent growth",
    "Growth and length retention are different. A careful history can help clarify what you are noticing.",
    [
      "areas that seem slower",
      "difficulty retaining length",
      "changes from your usual pattern",
    ],
    [
      "breakage",
      "scalp environment",
      "routine inconsistency",
      "medical factors",
    ],
    ["svc-consult"],
  ],
  [
    "natural-hair-maintenance",
    "Natural-hair maintenance",
    "Build a routine that supports your texture without turning care into a full-time job.",
    [
      "persistent dryness",
      "difficult detangling",
      "uncertain product layering",
    ],
    ["routine fit", "product use", "handling", "protective styling habits"],
    ["svc-natural", "svc-treatment"],
  ],
  [
    "post-treatment-scalp-care",
    "Post-treatment scalp care",
    "A gentle care plan can support comfort after a completed treatment or procedure.",
    ["sensitivity", "dryness", "uncertainty about products"],
    ["treatment aftercare", "irritant exposure", "healing stage"],
    ["svc-consult", "svc-therapy"],
  ],
].map(([slug, name, summary, signs, factors, relatedServiceIds]) => ({
  slug: slug as string,
  name: name as string,
  summary: summary as string,
  overview: `${summary} Tamlois can document your history, observe visible signs and help you choose an appropriate next step. This educational content is not a diagnosis.`,
  signs: signs as string[],
  factors: factors as string[],
  relatedServiceIds: relatedServiceIds as string[],
  assessment:
    "The clinic can review your routine, relevant history, visible scalp and hair characteristics, then discuss whether clinic care or a medical referral is more appropriate.",
  doctorNote:
    "Seek prompt medical advice for sudden or severe hair loss, pain, bleeding, infection, widespread rash, fever, or symptoms affecting your general health.",
}));

const productImage =
  "https://images.pexels.com/photos/30595022/pexels-photo-30595022.jpeg?auto=compress&cs=tinysrgb&w=900";

export const products: Product[] = [
  {
    id: "prd-cleanse",
    title: "Scalp cleansing treatment",
    summary: "A demo clarifying pre-wash treatment.",
    price: 12500,
    category: "Scalp care",
    available: true,
    featured: true,
    image: `${productImage}&sig=0`,
    imageAlt: "Scalp cleansing treatment, placeholder product image",
  },
  {
    id: "prd-mist",
    title: "Moisturising hair mist",
    summary: "A lightweight demo hydration mist.",
    price: 8500,
    category: "Moisture",
    available: true,
    featured: true,
    image: `${productImage}&sig=1`,
    imageAlt: "Moisturising hair mist, placeholder product image",
  },
  {
    id: "prd-oil",
    title: "Botanical scalp oil",
    summary: "A demo finishing oil. Suitability varies by scalp.",
    price: 10000,
    category: "Scalp care",
    available: true,
    featured: true,
    image: `${productImage}&sig=2`,
    imageAlt: "Botanical scalp oil, placeholder product image",
  },
];

export const faqs = [
  [
    "Do I need a consultation first?",
    "Some services require one. If you are unsure or managing hair loss, start with a trichology consultation.",
  ],
  [
    "How do I choose a service?",
    "Begin with the concern pages or select a consultation. The clinic can refine your care path after assessment.",
  ],
  [
    "Are deposits required?",
    "Placeholder policy: services marked in the catalogue require the displayed deposit. Confirm the final rule before launch.",
  ],
  [
    "Can I reschedule?",
    "Placeholder policy: contact the clinic at least 24 hours before your appointment. Final terms must be confirmed.",
  ],
  [
    "How should I prepare?",
    "Follow the preparation note on your selected service. Avoid concealing the scalp with heavy products unless advised otherwise.",
  ],
  [
    "Will treatment regrow my hair?",
    "No outcome is guaranteed. Care depends on the cause, timing, adherence and whether medical treatment is needed.",
  ],
  [
    "Do you treat children?",
    "The minimum-age and guardian policy has not been confirmed. Please contact the clinic before booking for a child.",
  ],
  [
    "Where is the clinic?",
    "The final address is awaiting confirmation. Appointments are required.",
  ],
] as const;

export const contact = {
  address: "16, Road 21, Gowon Estate, Lagos, Nigeria",
  phone: import.meta.env.VITE_BUSINESS_PHONE || "+234 081 344 3908",
  whatsapp: import.meta.env.VITE_BUSINESS_WHATSAPP || "+234 081 344 3908",
  email: import.meta.env.VITE_BUSINESS_EMAIL || "hello@tamlois.com",
  instagram: "@tamloisnaturalsmore",
  mapsUrl: import.meta.env.VITE_GOOGLE_MAPS_URL || "#",
};

export const testimonials = [
  {
    id: "test-1",
    quote:
      "The consultation helped me understand what to track and what questions to take to my doctor.",
    name: "Aderonke A.",
    label: "testimonial.",
  },
  {
    id: "test-2",
    quote:
      "I left with a routine I could actually follow and a clearer plan for my scalp care.",
    name: "Chioma N.",
    label: "testimonial.",
  },
];
