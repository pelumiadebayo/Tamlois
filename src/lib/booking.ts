import { z } from "zod";
import type {
  BookingPolicy,
  BookingStatus,
  IntakeQuestion,
  PaymentMode,
  PaymentSettings,
  Service,
  ServiceExtra,
} from "../types";

export const bookingSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name."),
  phone: z.string().trim().min(7, "Enter a valid phone number."),
  email: z.email("Enter a valid email address."),
  preferredContact: z.union([
    z.enum(["phone", "whatsapp", "email"]),
    z.literal(""),
  ]),
  concern: z.string().trim().max(2000, "Keep this answer under 2,000 characters."),
  hopes: z.string().trim().max(2000, "Keep this answer under 2,000 characters."),
  concernDuration: z.string().max(200),
  priorProfessionalTreatment: z.string().max(500),
  productsTreatments: z
    .string()
    .max(800, "Keep this answer under 800 characters."),
  note: z.string().max(800, "Keep the note under 800 characters."),
});

export type BookingFormData = z.infer<typeof bookingSchema>;

export function generateBookingReference(
  now = new Date(),
  random = Math.random,
): string {
  const date = now.toISOString().slice(2, 10).replaceAll("-", "");
  const suffix = Math.floor(random() * 1679616)
    .toString(36)
    .padStart(4, "0")
    .toUpperCase();
  return `TAM-${date}-${suffix}`;
}

export function generateManagementToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join(
    "",
  );
}

const transitions: Record<BookingStatus, BookingStatus[]> = {
  draft: ["slot-held", "expired", "cancelled"],
  "slot-held": ["pending-payment", "request-submitted", "expired", "cancelled"],
  "pending-payment": [
    "request-submitted",
    "pending-confirmation",
    "confirmed",
    "expired",
    "cancelled",
  ],
  "request-submitted": [
    "pending-confirmation",
    "confirmed",
    "cancelled",
    "reschedule-requested",
    "cancellation-requested",
  ],
  "pending-confirmation": [
    "confirmed",
    "cancelled",
    "reschedule-requested",
    "cancellation-requested",
  ],
  confirmed: [
    "completed",
    "cancelled",
    "no-show",
    "reschedule-requested",
    "cancellation-requested",
  ],
  "reschedule-requested": ["confirmed", "cancelled"],
  "cancellation-requested": ["confirmed", "cancelled"],
  completed: [],
  cancelled: [],
  "no-show": [],
  expired: [],
};

export const canTransitionBooking = (from: BookingStatus, to: BookingStatus) =>
  transitions[from].includes(to);
export const currency = (value: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);

export function policyBundleVersion(policies: BookingPolicy[]) {
  const source = policies
    .filter((policy) => policy.active)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((policy) => `${policy.id}@${policy.version}`)
    .join("|");
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1)
    hash = Math.imul(hash ^ source.charCodeAt(index), 16777619);
  return `bundle-${(hash >>> 0).toString(36)}`;
}

export function compatibleExtras(serviceId: string, extras: ServiceExtra[]) {
  return extras
    .filter(
      (extra) => extra.active && extra.compatibleServiceIds.includes(serviceId),
    )
    .sort((a, b) => a.order - b.order);
}

export function resolveExtraSelection(
  extraId: string,
  selectedIds: string[],
  extras: ServiceExtra[],
) {
  const selected = extras.find((extra) => extra.id === extraId);
  if (!selected) return selectedIds;
  if (selectedIds.includes(extraId))
    return selectedIds.filter((id) => id !== extraId);
  return [
    ...selectedIds.filter(
      (id) =>
        !selected.incompatibleExtraIds.includes(id) &&
        !extras
          .find((candidate) => candidate.id === id)
          ?.incompatibleExtraIds.includes(extraId),
    ),
    extraId,
  ];
}

export function calculateBookingTotals(
  service: Service,
  extras: ServiceExtra[],
  mode: PaymentMode,
  settings: PaymentSettings,
) {
  const subtotal =
    service.price + extras.reduce((sum, extra) => sum + extra.price, 0);
  const totalDuration =
    service.duration + extras.reduce((sum, extra) => sum + extra.duration, 0);
  const amountDueNow =
    mode === "full"
      ? subtotal
      : mode === "deposit_percentage"
        ? Math.round((subtotal * settings.depositPercentage) / 100)
        : mode === "deposit_fixed"
          ? Math.min(subtotal, settings.fixedDepositAmount)
          : 0;
  return {
    subtotal,
    totalDuration,
    amountDueNow,
    balanceDue: subtotal - amountDueNow,
  };
}

export function validateImageFile(
  file: Pick<File, "name" | "type" | "size">,
  maxBytes = 5 * 1024 * 1024,
) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    return "Use a JPG, PNG or WebP image.";
  if (file.size > maxBytes) return "Choose an image smaller than 5 MB.";
  return "";
}

export function sanitizeIntakeResponses(
  questions: IntakeQuestion[],
  responses: Record<string, string | string[] | boolean>,
) {
  return Object.fromEntries(
    Object.entries(responses).filter(([id]) => {
      const question = questions.find((item) => item.id === id);
      return (
        question &&
        (!question.condition ||
          responses[question.condition.questionId] ===
            question.condition.equals)
      );
    }),
  );
}
