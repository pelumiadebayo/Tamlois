import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { FirebaseBookingRepository, BookingCapacityError } from "../src/repositories/firebaseBookingRepository";
import type { CreateBookingInput, Service } from "../src/types";

const PROJECT_ID = "demo-tamlois-owner-auth";
const OWNER_UID = "0CZw1AFTjMXudXtvFST0z2ufET02";
let environment: RulesTestEnvironment;

beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: await readFile(resolve("firestore.rules"), "utf8") },
  });
});

beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "services", "salon-live"), serviceDoc(salonService));
    await setDoc(doc(context.firestore(), "services", "trich-live"), serviceDoc(trichologyService));
    await setDoc(doc(context.firestore(), "bookingPolicies", "appointments"), {
      id: "appointments",
      title: "Appointment-only care",
      summary: "Appointments must be booked in advance.",
      displayOrder: 0,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });
});

afterAll(async () => environment.cleanup());

function customerRepository(uid: string) {
  const firestore = environment.authenticatedContext(uid, {
    firebase: { sign_in_provider: "anonymous" },
  }).firestore();
  return {
    firestore,
    repository: new FirebaseBookingRepository(firestore, async () => ({ uid })),
  };
}

function ownerRepository() {
  const firestore = environment.authenticatedContext(OWNER_UID).firestore();
  return new FirebaseBookingRepository(
    firestore,
    async () => ({ uid: OWNER_UID }),
    () => OWNER_UID,
  );
}

describe("Firestore booking transactions", () => {
  it("assigns the first three Salon seats and atomically rejects the fourth", async () => {
    for (let index = 1; index <= 3; index += 1) {
      const { repository } = customerRepository(`salon-customer-${index}`);
      const booking = await repository.createBooking(
        input(salonService, `salon-${index}`, `TAM-SALON-000${index}`, "09:00"),
      );
      expect(booking.lockIds).toEqual([
        `${booking.date}_morning_seat-${index}`,
      ]);
    }
    const fourth = customerRepository("salon-customer-4");
    await expect(
      fourth.repository.createBooking(
        input(salonService, "salon-4", "TAM-SALON-0004", "09:00"),
      ),
    ).rejects.toMatchObject({ code: "SESSION_FULL" });
    expect(await documentExists("bookings", "salon-4")).toBe(false);
  });

  it("releases a Salon seat when the owner cancels", async () => {
    const customer = customerRepository("cancel-customer");
    const created = await customer.repository.createBooking(
      input(salonService, "cancel-booking", "TAM-CANCEL-001", "09:00"),
    );
    await ownerRepository().cancelBookingAsAdmin(created.id);
    const replacement = customerRepository("replacement-customer");
    const next = await replacement.repository.createBooking(
      input(salonService, "replacement", "TAM-REPLACE-001", "09:00"),
    );
    expect(next.lockIds).toEqual(created.lockIds);
  });

  it("locks every Trichology unit and rejects overlap without partial writes", async () => {
    const first = customerRepository("trich-customer-1");
    const booking = await first.repository.createBooking(
      input(trichologyService, "trich-1", "TAM-TRICH-0001", "09:00"),
    );
    expect(booking.lockIds).toHaveLength(4);

    const overlap = customerRepository("trich-customer-2");
    await expect(
      overlap.repository.createBooking(
        input(trichologyService, "trich-2", "TAM-TRICH-0002", "10:00"),
      ),
    ).rejects.toBeInstanceOf(BookingCapacityError);
    expect(await documentExists("bookings", "trich-2")).toBe(false);

    const nonOverlap = customerRepository("trich-customer-3");
    await expect(
      nonOverlap.repository.createBooking(
        input(trichologyService, "trich-3", "TAM-TRICH-0003", "11:00"),
      ),
    ).resolves.toMatchObject({ id: "trich-3" });
  });

  it("fails closed when an operational unit is blocked", async () => {
    const date = futureOpenDate();
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "blockedPeriods", `${date}_09-00`), {
        id: `${date}_09-00`,
        date,
        unitTime: "09-00",
        groupId: "test-block",
        kind: "time-range",
      });
    });
    const customer = customerRepository("blocked-customer");
    await expect(
      customer.repository.createBooking(
        input(trichologyService, "blocked", "TAM-BLOCK-0001", "09:00"),
      ),
    ).rejects.toMatchObject({ code: "BLOCKED" });
    expect((await getDocs(collection(customer.firestore, "bookingLocks"))).empty).toBe(true);
  });

  it("rejects an inactive service inside the transaction", async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "services", "salon-live"), {
        ...serviceDoc(salonService),
        active: false,
      });
    });
    const customer = customerRepository("inactive-customer");
    await expect(
      customer.repository.createBooking(
        input(salonService, "inactive", "TAM-INACTIVE-1", "09:00"),
      ),
    ).rejects.toMatchObject({ code: "BOOKING_FAILED" });
    expect(await documentExists("bookings", "inactive")).toBe(false);
  });

  it("rejects consent for a policy that was edited or deleted", async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await deleteDoc(
        doc(context.firestore(), "bookingPolicies", "appointments"),
      );
    });
    const customer = customerRepository("stale-policy-customer");
    await expect(
      customer.repository.createBooking(
        input(salonService, "stale-policy", "TAM-POLICY-0001", "09:00"),
      ),
    ).rejects.toMatchObject({ code: "POLICY_CHANGED" });
    expect(await documentExists("bookings", "stale-policy")).toBe(false);
  });
});

async function documentExists(collectionName: string, id: string) {
  let exists = false;
  await environment.withSecurityRulesDisabled(async (context) => {
    exists = (
      await getDoc(doc(context.firestore(), collectionName, id))
    ).exists();
  });
  return exists;
}

function futureOpenDate() {
  const date = new Date(Date.now() + 14 * 86_400_000);
  while (date.getUTCDay() === 0) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function input(
  service: Service,
  bookingId: string,
  bookingReference: string,
  startTime: string,
): CreateBookingInput {
  return {
    bookingId,
    bookingReference,
    service,
    extras: [],
    date: futureOpenDate(),
    startTime,
    details: {
      fullName: "Ada Okafor",
      phone: "08012345678",
      email: "ada@example.com",
      preferredContact: "email",
      concern: "",
      hopes: "",
      concernDuration: "",
      priorProfessionalTreatment: "",
      productsTreatments: "",
      note: "",
    },
    intakeResponses: {},
    policyConsentRecord: {
      accepted: true,
      version: "v1",
      acceptedAt: new Date().toISOString(),
      sessionId: "test-session",
      policies: [
        {
          id: "appointments",
          title: "Appointment-only care",
          summary: "Appointments must be booked in advance.",
          version: 1,
        },
      ],
    },
    addressSnapshot: "Tamlois clinic",
  };
}

const salonService: Service = {
  id: "salon-live", slug: "salon-live", name: "Natural hair care", category: "salon", type: "service",
  summary: "Natural hair care.", description: "Natural hair care.", concerns: [], price: 24000,
  duration: 60, durationMinutes: 60, preparation: "Arrive prepared.", expectation: "Care session.",
  aftercare: "Follow advice.", caution: "Share sensitivities.", consultationRequired: false,
  depositRequired: false, depositAmount: 0, active: true, archived: false, order: 1, displayOrder: 1,
  schedulingMode: "salon-session", image: "https://example.com/salon.jpg", imageAlt: "Salon",
  variations: [], placeholder: false,
};

const trichologyService: Service = {
  ...salonService,
  id: "trich-live",
  slug: "trich-live",
  name: "Trichology consultation",
  category: "trichology",
  duration: 90,
  durationMinutes: 90,
  schedulingMode: "precise-time",
};

function serviceDoc(service: Service) {
  return {
    ...service,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
