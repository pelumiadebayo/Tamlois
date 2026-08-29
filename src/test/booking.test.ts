import { describe, expect, it } from "vitest";
import { Timestamp } from "firebase/firestore";
import {
  bookingSchema,
  calculateBookingTotals,
  canTransitionBooking,
  compatibleExtras,
  generateBookingReference,
  isPolicyConsentCurrent,
  policyBundleVersion,
  policyConsentSnapshots,
  resolveExtraSelection,
  sanitizeIntakeResponses,
  validateImageFile,
} from "../lib/booking";
import { trichologyUnitLockIds } from "../lib/bookingCapacity";
import {
  intakeQuestions,
  serviceExtras,
  services,
} from "../data/content";
import { defaultSettings } from "../lib/availability";
import type { BookingPolicy } from "../types";

const policyTimestamp = Timestamp.fromDate(new Date("2026-08-29T09:00:00Z"));
const bookingPolicies: BookingPolicy[] = [
  {
    id: "appointments",
    title: "Appointment-only care",
    summary: "Appointments must be booked in advance.",
    displayOrder: 0,
    version: 1,
    createdAt: policyTimestamp,
    updatedAt: policyTimestamp,
  },
  {
    id: "changes",
    title: "Changes",
    summary: "Contact the clinic before changing an appointment.",
    displayOrder: 1,
    version: 2,
    createdAt: policyTimestamp,
    updatedAt: policyTimestamp,
  },
];

describe("booking helpers", () => {
  it("requires only full name, phone and email in customer details", () => {
    expect(
      bookingSchema.safeParse({
        fullName: "",
        phone: "",
        email: "bad",
        preferredContact: "",
        concern: "",
        hopes: "",
        concernDuration: "",
        priorProfessionalTreatment: "",
        productsTreatments: "",
        note: "",
      }).success,
    ).toBe(false);
    expect(
      bookingSchema.safeParse({
        fullName: "Ada Okafor",
        phone: "08012345678",
        email: "ada@example.com",
        preferredContact: "",
        concern: "",
        hopes: "",
        concernDuration: "",
        priorProfessionalTreatment: "",
        productsTreatments: "",
        note: "",
      }).success,
    ).toBe(true);
  });
  it("generates a stable-format reference", () =>
    expect(
      generateBookingReference(new Date("2026-08-18T10:00:00.000Z"), () => 0),
    ).toBe("TAM-260818-0000"));
  it("allows only valid status transitions", () => {
    expect(canTransitionBooking("pending-confirmation", "confirmed")).toBe(
      true,
    );
    expect(canTransitionBooking("completed", "draft")).toBe(false);
  });
  it("creates deterministic interval locks including buffer time", () => {
    expect(trichologyUnitLockIds("2026-09-01", "10:00", 60, 15)).toEqual([
      "2026-09-01_10-00",
      "2026-09-01_10-30",
      "2026-09-01_11-00",
    ]);
  });
  it("filters extras by service compatibility", () =>
    expect(
      compatibleExtras("svc-consult", serviceExtras).every((item) =>
        item.compatibleServiceIds.includes("svc-consult"),
      ),
    ).toBe(true));
  it("provides the three named extras for each Salon service", () => {
    const expected = [
      ["Wig Installation Service", 2000],
      ["Clay detox", 8500],
      ["Hair Trims", 5000],
    ];
    for (const serviceId of ["svc-treatment", "svc-natural"]) {
      expect(
        compatibleExtras(serviceId, serviceExtras).map(({ name, price }) => [
          name,
          price,
        ]),
      ).toEqual(expected);
    }
  });
  it("toggles a compatible Salon extra without removing another", () =>
    expect(
      resolveExtraSelection(
        "extra-clay-detox",
        ["extra-wig-installation"],
        serviceExtras,
      ),
    ).toEqual(["extra-wig-installation", "extra-clay-detox"]));
  it("calculates duration, subtotal, deposit and balance together", () => {
    const totals = calculateBookingTotals(
      services.find((item) => item.id === "svc-natural")!,
      [serviceExtras.find((item) => item.id === "extra-clay-detox")!],
      "deposit_percentage",
      defaultSettings.payment,
    );
    expect(totals).toEqual({
      subtotal: 32500,
      totalDuration: 150,
      amountDueNow: 16250,
      balanceDue: 16250,
    });
  });
  it("validates optional image type and size", () => {
    expect(
      validateImageFile({
        name: "photo.pdf",
        type: "application/pdf",
        size: 1,
      }),
    ).toMatch(/JPG/);
    expect(
      validateImageFile({
        name: "photo.jpg",
        type: "image/jpeg",
        size: 6 * 1024 * 1024,
      }),
    ).toMatch(/smaller/);
    expect(
      validateImageFile({ name: "photo.webp", type: "image/webp", size: 1000 }),
    ).toBe("");
  });
  it("versions the complete policy bundle deterministically", () => {
    const first = policyBundleVersion(bookingPolicies);
    expect(policyBundleVersion([...bookingPolicies].reverse())).toBe(first);
    expect(
      policyBundleVersion(
        bookingPolicies.map((policy, index) =>
          index === 1
            ? { ...policy, version: policy.version + 1 }
            : policy,
        ),
      ),
    ).not.toBe(first);
  });
  it("captures immutable public policy fields for booking consent", () => {
    const snapshots = policyConsentSnapshots(bookingPolicies);
    expect(snapshots).toEqual([
      {
        id: "appointments",
        title: "Appointment-only care",
        summary: "Appointments must be booked in advance.",
        version: 1,
      },
      {
        id: "changes",
        title: "Changes",
        summary: "Contact the clinic before changing an appointment.",
        version: 2,
      },
    ]);
    expect(snapshots[0]).not.toBe(bookingPolicies[0]);
  });
  it("fails closed without policies and invalidates stale consent", () => {
    const consent = {
      accepted: true as const,
      version: policyBundleVersion(bookingPolicies),
      acceptedAt: "2026-08-29T09:00:00.000Z",
      sessionId: "session-one",
      policies: policyConsentSnapshots(bookingPolicies),
    };
    expect(isPolicyConsentCurrent([], consent)).toBe(false);
    expect(isPolicyConsentCurrent(bookingPolicies, consent)).toBe(true);
    expect(
      isPolicyConsentCurrent(
        bookingPolicies.map((policy, index) =>
          index === 0
            ? { ...policy, summary: "The wording has changed.", version: 2 }
            : policy,
        ),
        consent,
      ),
    ).toBe(false);
  });
  it("purges answers when their conditional question becomes hidden", () => {
    const conditional = intakeQuestions.find((question) => question.condition);
    expect(conditional).toBeTruthy();
    const controllingId = conditional!.condition!.questionId;
    const responses = sanitizeIntakeResponses(intakeQuestions, {
      [controllingId]: "No",
      [conditional!.id]: ["Private answer"],
    });
    expect(responses[conditional!.id]).toBeUndefined();
  });
});
