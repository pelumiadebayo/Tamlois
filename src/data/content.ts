import type {
  BookingPolicy,
  Concern,
  IntakeQuestion,
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
    order: 1,
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
    order: 2,
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
    name: "Hair-loss management review",
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
    slug: "restorative-hair-treatment",
    name: "Restorative hair treatment",
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
    name: "Natural hair care session",
    category: "salon",
    type: "service",
    intakeSchemaId: "intake-salon",
    summary:
      "A calm wash, condition and maintenance session for textured natural hair.",
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
    order: 7,
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
    id: "extra-steam",
    name: "Hydration steam",
    description: "A gentle steam stage added to a compatible salon treatment.",
    price: 5000,
    duration: 20,
    compatibleServiceIds: ["svc-treatment", "svc-natural"],
    incompatibleExtraIds: [],
    active: true,
    order: 1,
    placeholder: true,
  },
  {
    id: "extra-detangle",
    name: "Extended detangling",
    description:
      "Additional time for careful detangling where the service allows it.",
    price: 7000,
    duration: 30,
    compatibleServiceIds: ["svc-treatment", "svc-natural"],
    incompatibleExtraIds: ["extra-express"],
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
    id: "extra-express",
    name: "Express finish",
    description:
      "A shorter finish option that cannot be combined with extended detangling.",
    price: 3500,
    duration: 10,
    compatibleServiceIds: ["svc-natural"],
    incompatibleExtraIds: ["extra-detangle"],
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
    required: true,
    order: 1,
    active: true,
  },
  {
    id: "intake-medical-review",
    schemaId: "intake-trichology",
    label: "Have you discussed this concern with a doctor or dermatologist?",
    type: "single-choice",
    options: ["Yes", "No", "Appointment booked"],
    required: true,
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
    required: true,
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

export const bookingPolicies: BookingPolicy[] = [
  {
    id: "appointments",
    version: "2026-08-placeholder-v1",
    effectiveFrom: "2026-08-01",
    title: "Appointment-only care",
    summary:
      "All clinic and salon services require an appointment. Walk-ins are not assumed.",
    fullText:
      "Placeholder policy: all services are appointment-only and availability is only secured after the required booking stage is completed.",
    active: true,
    placeholder: true,
  },
  {
    id: "notice",
    version: "2026-08-placeholder-v1",
    effectiveFrom: "2026-08-01",
    title: "Notice and timing",
    summary:
      "Book at least 4 hours ahead. Arrive on time; late arrival may shorten or move the appointment.",
    fullText:
      "Placeholder policy: minimum notice, maximum booking window, lateness and no-show rules must be confirmed by the clinic before launch.",
    active: true,
    placeholder: true,
  },
  {
    id: "payment",
    version: "2026-08-placeholder-v1",
    effectiveFrom: "2026-08-01",
    title: "Payment and deposits",
    summary:
      "A full payment or 50% demo deposit may be selected. Remaining balance is due at the clinic.",
    fullText:
      "Placeholder policy: payment, deposit, refund and balance-due terms are illustrative and do not create a live transaction.",
    active: true,
    placeholder: true,
  },
  {
    id: "changes",
    version: "2026-08-placeholder-v1",
    effectiveFrom: "2026-08-01",
    title: "Cancellation and rescheduling",
    summary:
      "Contact the clinic at least 24 hours before the appointment to request a change.",
    fullText:
      "Placeholder policy: late cancellation, rescheduling, no-show and refund terms require final owner approval.",
    active: true,
    placeholder: true,
  },
  {
    id: "preparation",
    version: "2026-08-placeholder-v1",
    effectiveFrom: "2026-08-01",
    title: "Preparation and accurate information",
    summary:
      "Follow the selected service preparation note and provide complete, accurate intake information.",
    fullText:
      "Preparation can affect the appointment. The clinic may change or decline a service if important health or treatment information is missing.",
    active: true,
    placeholder: true,
  },
  {
    id: "privacy",
    version: "2026-08-placeholder-v1",
    effectiveFrom: "2026-08-01",
    title: "Privacy and optional photos",
    summary:
      "Booking details are used to manage care. Optional photos are private appointment-preparation material, never public results.",
    fullText:
      "Optional photos do not provide an online diagnosis. In a live build they require explicit consent, private storage and short-lived secure access.",
    active: true,
    placeholder: true,
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
  [
    "prd-cleanse",
    "Scalp cleansing treatment",
    "A demo clarifying pre-wash treatment.",
    12500,
    "Scalp care",
    true,
    true,
  ],
  [
    "prd-mist",
    "Moisturising hair mist",
    "A lightweight demo hydration mist.",
    8500,
    "Moisture",
    true,
    true,
  ],
  [
    "prd-oil",
    "Botanical scalp oil",
    "A demo finishing oil. Suitability varies by scalp.",
    10000,
    "Scalp care",
    true,
    true,
  ],
  [
    "prd-bundle",
    "Natural-hair care bundle",
    "A demo cleansing, moisture and sealing set.",
    32000,
    "Bundles",
    true,
    true,
  ],
  [
    "prd-bonnet",
    "Satin bonnet",
    "A demo adjustable sleep bonnet.",
    7500,
    "Accessories",
    true,
    false,
  ],
  [
    "prd-aftercare",
    "Consultation aftercare kit",
    "A demo kit selected after a clinic visit.",
    28000,
    "Bundles",
    false,
    false,
  ],
].map(([id, title, summary, price, category, available, featured], index) => ({
  id,
  title,
  summary,
  price,
  category,
  available,
  featured,
  image: `${productImage}&sig=${index}`,
  imageAlt: `${title}, placeholder product image`,
})) as Product[];

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
  address: "[Clinic address to be confirmed]",
  phone: import.meta.env.VITE_BUSINESS_PHONE || "+234 000 000 0000",
  whatsapp: import.meta.env.VITE_BUSINESS_WHATSAPP || "+234 000 000 0000",
  email: import.meta.env.VITE_BUSINESS_EMAIL || "hello@example.com",
  instagram: "@tamlois_placeholder",
  mapsUrl: import.meta.env.VITE_GOOGLE_MAPS_URL || "#",
};

export const testimonials = [
  {
    id: "test-1",
    quote:
      "The consultation helped me understand what to track and what questions to take to my doctor.",
    name: "Aderonke A.",
    label: "Illustrative testimonial. Replace before launch.",
  },
  {
    id: "test-2",
    quote:
      "I left with a routine I could actually follow and a clearer plan for my scalp care.",
    name: "Chioma N.",
    label: "Illustrative testimonial. Replace before launch.",
  },
];
