import { describe, expect, it } from "vitest";
import {
  bookingSchema,
  calculateBookingTotals,
  canTransitionBooking,
  compatibleExtras,
  generateBookingReference,
  policyBundleVersion,
  resolveExtraSelection,
  sanitizeIntakeResponses,
  validateImageFile,
} from "../lib/booking";
import { bookingLockIds } from "../repositories/firestoreRepository";
import {
  bookingPolicies,
  intakeQuestions,
  serviceExtras,
  services,
} from "../data/content";
import { defaultSettings } from "../lib/availability";

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
    expect(bookingLockIds("2026-09-01", "10:00", "11:00", 30, 15)).toEqual([
      "2026-09-01_1000",
      "2026-09-01_1030",
      "2026-09-01_1100",
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
  it("versions the complete active policy bundle deterministically", () => {
    const first = policyBundleVersion(bookingPolicies);
    expect(policyBundleVersion([...bookingPolicies].reverse())).toBe(first);
    expect(
      policyBundleVersion(
        bookingPolicies.map((policy, index) =>
          index === 1
            ? { ...policy, version: `${policy.version}-revised` }
            : policy,
        ),
      ),
    ).not.toBe(first);
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
