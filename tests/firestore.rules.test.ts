import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const PROJECT_ID = "demo-tamlois-owner-auth";
let testEnvironment: RulesTestEnvironment;
let ownerUid: string;

function configuredOwnerUid(rules: string) {
  const match = rules.match(
    /function ownerUid\(\)\s*\{[\s\S]*?return\s+'([^']+)'\s*;/,
  );
  if (!match?.[1]) throw new Error("firestore.rules must define ownerUid().");
  return match[1];
}

function anonymous(uid: string) {
  return testEnvironment.authenticatedContext(uid, {
    firebase: { sign_in_provider: "anonymous" },
  }).firestore();
}

beforeAll(async () => {
  const rules = await readFile(resolve("firestore.rules"), "utf8");
  ownerUid = configuredOwnerUid(rules);
  testEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules },
  });
});

beforeEach(async () => {
  await testEnvironment.clearFirestore();
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    await setDoc(doc(firestore, "services", "salon-service"), serviceRecord());
    await setDoc(doc(firestore, "bookings", "existing-booking"), {
      id: "existing-booking",
      ownerUid: "customer-a",
      reference: "TAM-EXISTING",
    });
  });
});

afterAll(async () => testEnvironment.cleanup());

describe("single-owner authorization and public catalogue", () => {
  it("denies a signed-out visitor from private data", async () => {
    const firestore = testEnvironment.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(firestore, "bookings", "existing-booking")));
  });

  it("allows the configured owner to create deterministic blocks", async () => {
    expect(ownerUid).toBe("0CZw1AFTjMXudXtvFST0z2ufET02");
    const firestore = testEnvironment.authenticatedContext(ownerUid).firestore();
    await assertSucceeds(
      setDoc(doc(firestore, "blockedPeriods", "2026-09-01_09-00"), {
        id: "2026-09-01_09-00",
        date: "2026-09-01",
        unitTime: "09-00",
        groupId: "block-one",
        kind: "time-range",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("allows the owner to atomically create a block range and its private detail", async () => {
    const firestore = testEnvironment.authenticatedContext(ownerUid).firestore();
    const units = ["10-00", "10-30", "11-00"].map((unitTime) => ({
      unitTime,
      id: `2026-09-02_${unitTime}`,
    }));
    await assertSucceeds(
      runTransaction(firestore, async (transaction) => {
        const unitReferences = units.map(({ id }) =>
          doc(firestore, "blockedPeriods", id),
        );
        const snapshots = await Promise.all(
          unitReferences.map((reference) => transaction.get(reference)),
        );
        expect(snapshots.every((snapshot) => !snapshot.exists())).toBe(true);
        units.forEach(({ id, unitTime }, index) => {
          transaction.set(unitReferences[index], {
            id,
            date: "2026-09-02",
            unitTime,
            groupId: "staff-meeting",
            kind: "time-range",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        });
        transaction.set(
          doc(firestore, "blockedPeriodDetails", "staff-meeting"),
          {
            id: "staff-meeting",
            date: "2026-09-02",
            start: "10:15",
            end: "11:15",
            reason: "Staff meeting",
            kind: "time-range",
            adminUid: ownerUid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
        );
      }),
    );
    await assertSucceeds(
      getDoc(
        doc(firestore, "blockedPeriodDetails", "staff-meeting"),
      ),
    );
  });

  it("allows an authenticated customer to read a bounded full-day calendar reason", async () => {
    const owner = testEnvironment.authenticatedContext(ownerUid).firestore();
    await assertSucceeds(
      setDoc(doc(owner, "blockedPeriods", "2026-09-01_09-00"), {
        id: "2026-09-01_09-00",
        date: "2026-09-01",
        unitTime: "09-00",
        groupId: "block-one",
        kind: "all-day",
        publicReason: "Staff training",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
    const customer = anonymous("calendar-customer");
    const snapshot = await assertSucceeds(
      getDoc(doc(customer, "blockedPeriods", "2026-09-01_09-00")),
    );
    expect(snapshot.data()?.publicReason).toBe("Staff training");
  });

  it("rejects public reasons on partial blocks", async () => {
    const owner = testEnvironment.authenticatedContext(ownerUid).firestore();
    await assertFails(
      setDoc(doc(owner, "blockedPeriods", "2026-09-01_09-00"), {
        id: "2026-09-01_09-00",
        date: "2026-09-01",
        unitTime: "09-00",
        groupId: "block-one",
        kind: "time-range",
        publicReason: "Private appointment detail",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("lets the owner publish the reason on a legacy full-day block", async () => {
    const id = "2026-08-31_09-00";
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "blockedPeriods", id), {
        id,
        date: "2026-08-31",
        unitTime: "09-00",
        groupId: "legacy-full-day",
        kind: "all-day",
        createdAt: new Date("2026-08-28T09:00:00Z"),
        updatedAt: new Date("2026-08-28T09:00:00Z"),
      });
    });
    const owner = testEnvironment.authenticatedContext(ownerUid).firestore();
    await assertSucceeds(
      updateDoc(doc(owner, "blockedPeriods", id), {
        publicReason: "Holiday",
        updatedAt: serverTimestamp(),
      }),
    );
    const customer = anonymous("calendar-customer");
    const snapshot = await assertSucceeds(
      getDoc(doc(customer, "blockedPeriods", id)),
    );
    expect(snapshot.data()?.publicReason).toBe("Holiday");
  });

  it("denies a different authenticated UID from owner collections", async () => {
    const firestore = testEnvironment
      .authenticatedContext("ordinary-authenticated-user")
      .firestore();
    await assertFails(getDocs(collection(firestore, "bookings")));
    await assertFails(
      setDoc(doc(firestore, "auditLogs", "forged"), {
        id: "forged",
        action: "service.created",
        actorUid: "ordinary-authenticated-user",
        targetCollection: "services",
        targetId: "x",
        createdAt: serverTimestamp(),
      }),
    );
  });

  it("lets the owner list protected bookings", async () => {
    const firestore = testEnvironment.authenticatedContext(ownerUid).firestore();
    await assertSucceeds(getDocs(collection(firestore, "bookings")));
  });

  it("allows public reads only for active, non-archived services", async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), "services", "draft"),
        serviceRecord("draft", false),
      );
    });
    const firestore = testEnvironment.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(firestore, "services", "salon-service")));
    await assertFails(getDoc(doc(firestore, "services", "draft")));
    await assertSucceeds(
      getDocs(
        query(
          collection(firestore, "services"),
          where("active", "==", true),
          where("archived", "==", false),
        ),
      ),
    );
  });

  it("lets only the owner edit a valid service", async () => {
    const owner = testEnvironment.authenticatedContext(ownerUid).firestore();
    await assertSucceeds(
      updateDoc(doc(owner, "services", "salon-service"), {
        summary: "Updated natural hair care.",
        updatedAt: serverTimestamp(),
      }),
    );

    const ordinary = testEnvironment
      .authenticatedContext("ordinary-authenticated-user")
      .firestore();
    await assertFails(
      updateDoc(doc(ordinary, "services", "salon-service"), {
        summary: "Unauthorised change.",
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("lets the owner repair a legacy service missing createdAt exactly once", async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const legacy = serviceRecord("legacy-service");
      delete (legacy as Partial<typeof legacy>).createdAt;
      await setDoc(doc(context.firestore(), "services", "legacy-service"), legacy);
    });

    const owner = testEnvironment.authenticatedContext(ownerUid).firestore();
    await assertSucceeds(
      updateDoc(doc(owner, "services", "legacy-service"), {
        summary: "Repaired legacy service.",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );

    const repaired = await getDoc(doc(owner, "services", "legacy-service"));
    const createdAt = repaired.data()?.createdAt;
    await assertFails(
      updateDoc(doc(owner, "services", "legacy-service"), {
        createdAt: new Date("2020-01-01T00:00:00Z"),
        updatedAt: serverTimestamp(),
      }),
    );
    expect((await getDoc(doc(owner, "services", "legacy-service"))).data()?.createdAt).toEqual(
      createdAt,
    );
  });
});

describe("persisted payment and hold settings", () => {
  it("lets the owner atomically save the private and public settings documents", async () => {
    const firestore = testEnvironment.authenticatedContext(ownerUid).firestore();
    const batch = writeBatch(firestore);
    batch.set(
      doc(firestore, "businessSettings", "booking"),
      bookingSettingsRecord(),
    );
    batch.set(
      doc(firestore, "publicBookingSettings", "current"),
      bookingSettingsRecord(),
    );
    await assertSucceeds(batch.commit());

    const privateSettings = await assertSucceeds(
      getDoc(doc(firestore, "businessSettings", "booking")),
    );
    expect(privateSettings.data()?.payment.fixedDepositAmount).toBe(12500);
  });

  it("allows a direct public read but denies private and collection-list reads", async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), "publicBookingSettings", "current"),
        bookingSettingsRecord(false),
      );
      await setDoc(
        doc(context.firestore(), "businessSettings", "booking"),
        bookingSettingsRecord(false),
      );
    });
    const visitor = testEnvironment.unauthenticatedContext().firestore();
    await assertSucceeds(
      getDoc(doc(visitor, "publicBookingSettings", "current")),
    );
    await assertFails(
      getDocs(collection(visitor, "publicBookingSettings")),
    );
    await assertFails(
      getDoc(doc(visitor, "businessSettings", "booking")),
    );
  });

  it("denies settings writes from an ordinary authenticated account", async () => {
    const ordinary = testEnvironment
      .authenticatedContext("ordinary-authenticated-user")
      .firestore();
    await assertFails(
      setDoc(
        doc(ordinary, "publicBookingSettings", "current"),
        bookingSettingsRecord(),
      ),
    );
    await assertFails(
      setDoc(
        doc(ordinary, "businessSettings", "booking"),
        bookingSettingsRecord(),
      ),
    );
  });

  it("rejects invalid fixed deposits, duplicate modes and schema pollution", async () => {
    const owner = testEnvironment.authenticatedContext(ownerUid).firestore();
    await assertFails(
      setDoc(
        doc(owner, "businessSettings", "booking"),
        bookingSettingsRecord(true, { fixedDepositAmount: -1 }),
      ),
    );
    await assertFails(
      setDoc(
        doc(owner, "businessSettings", "booking"),
        bookingSettingsRecord(true, {
          enabledModes: ["clinic", "clinic"],
        }),
      ),
    );
    await assertFails(
      setDoc(doc(owner, "businessSettings", "booking"), {
        ...bookingSettingsRecord(),
        unexpected: "not allowed",
      }),
    );
  });
});

describe("public booking policies and owner management", () => {
  it("lets signed-out visitors read every existing policy", async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), "bookingPolicies", "appointments"),
        policyRecord("appointments", "Appointment-only care", 0),
      );
      await setDoc(
        doc(context.firestore(), "bookingPolicies", "changes"),
        policyRecord("changes", "Changes", 1),
      );
    });
    const firestore = testEnvironment.unauthenticatedContext().firestore();
    await assertSucceeds(
      getDoc(doc(firestore, "bookingPolicies", "appointments")),
    );
    const policies = await assertSucceeds(
      getDocs(collection(firestore, "bookingPolicies")),
    );
    expect(policies.size).toBe(2);
  });

  it("allows only the configured owner to create, edit and reorder policies", async () => {
    const owner = testEnvironment.authenticatedContext(ownerUid).firestore();
    const ordinary = testEnvironment
      .authenticatedContext("ordinary-authenticated-user")
      .firestore();
    await assertFails(
      setDoc(
        doc(ordinary, "bookingPolicies", "forged"),
        policyRecord("forged", "Forged policy", 0, true),
      ),
    );
    await assertSucceeds(
      setDoc(doc(owner, "bookingPolicies", "appointments"), {
        id: "appointments",
        title: "Appointment-only care",
        summary: "Appointments must be booked in advance.",
        displayOrder: 0,
        version: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(
      updateDoc(doc(owner, "bookingPolicies", "appointments"), {
        title: "Appointments require advance booking",
        version: 2,
        updatedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(
      updateDoc(doc(owner, "bookingPolicies", "appointments"), {
        displayOrder: 4,
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("permanently deletes a policy without changing historical bookings", async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), "bookingPolicies", "appointments"),
        policyRecord("appointments", "Appointment-only care", 0),
      );
    });
    const owner = testEnvironment.authenticatedContext(ownerUid).firestore();
    await assertSucceeds(
      deleteDoc(doc(owner, "bookingPolicies", "appointments")),
    );
    expect(
      (await getDoc(doc(owner, "bookings", "existing-booking"))).exists(),
    ).toBe(true);
  });
});

describe("anonymous booking ownership and locks", () => {
  it("creates a pending Salon booking and one deterministic lock atomically", async () => {
    const firestore = anonymous("customer-a");
    await assertSucceeds(createSalonBooking(firestore, "customer-a"));
    await assertSucceeds(getDoc(doc(firestore, "bookings", "booking-a")));
  });

  it("allows only the initial status required by the clinic approval setting", async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), "publicBookingSettings", "current"),
        bookingSettingsRecord(false, { approvalRequired: false }),
      );
    });
    const firestore = anonymous("customer-a");
    await assertFails(createSalonBooking(firestore, "customer-a"));
    await assertSucceeds(
      createSalonBooking(firestore, "customer-a", { status: "confirmed" }),
    );
    const booking = await assertSucceeds(
      getDoc(doc(firestore, "bookings", "booking-a")),
    );
    expect(booking.data()?.status).toBe("confirmed");
  });

  it("does not allow anonymous users to list bookings", async () => {
    const firestore = anonymous("customer-a");
    await assertFails(getDocs(collection(firestore, "bookings")));
  });

  it("prevents one customer from reading another customer's booking", async () => {
    await assertSucceeds(createSalonBooking(anonymous("customer-a"), "customer-a"));
    await assertFails(
      getDoc(doc(anonymous("customer-b"), "bookings", "booking-a")),
    );
  });

  it("rejects customer-created admin status and paid outcome", async () => {
    const firestore = anonymous("customer-a");
    await assertFails(
      createSalonBooking(firestore, "customer-a", {
        status: "confirmed",
        paymentStatus: "paid",
      }),
    );
  });

  it("rejects a lock containing PII", async () => {
    const firestore = anonymous("customer-a");
    await assertFails(
      createSalonBooking(firestore, "customer-a", {}, { email: "private@example.com" }),
    );
  });

  it("rejects a booking that is not atomically paired with its capacity lock", async () => {
    const firestore = anonymous("customer-a");
    await assertFails(
      setDoc(
        doc(firestore, "bookings", "booking-a"),
        salonBookingRecord("customer-a"),
      ),
    );
  });

  it("rejects a booking paired with a lock for a different booking", async () => {
    const firestore = anonymous("customer-a");
    await assertFails(
      createSalonBooking(
        firestore,
        "customer-a",
        {},
        { bookingId: "different-booking" },
      ),
    );
  });

  it("prevents customers from deleting active locks", async () => {
    const firestore = anonymous("customer-a");
    await assertSucceeds(createSalonBooking(firestore, "customer-a"));
    await assertFails(
      deleteDoc(doc(firestore, "bookingLocks", "2026-09-02_morning_seat-1")),
    );
  });

  it("prevents the owner from rewriting accepted policy snapshots", async () => {
    await assertSucceeds(createSalonBooking(anonymous("customer-a"), "customer-a"));
    const owner = testEnvironment.authenticatedContext(ownerUid).firestore();
    await assertFails(
      updateDoc(doc(owner, "bookings", "booking-a"), {
        "policyConsentRecord.policies": [
          {
            id: "replacement",
            title: "Replacement policy",
            summary: "This must not replace historical consent.",
            version: 1,
          },
        ],
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("denies unauthenticated booking and lock writes", async () => {
    const firestore = testEnvironment.unauthenticatedContext().firestore();
    await assertFails(createSalonBooking(firestore, "signed-out"));
  });

  it("default-denies unspecified collections including gallery", async () => {
    const firestore = testEnvironment.authenticatedContext(ownerUid).firestore();
    await assertFails(setDoc(doc(firestore, "gallery", "unused"), { id: "unused" }));
  });
});

function createSalonBooking(
  firestore: Firestore,
  uid: string,
  bookingOverrides: Record<string, unknown> = {},
  lockOverrides: Record<string, unknown> = {},
) {
  const bookingId = "booking-a";
  const lockId = "2026-09-02_morning_seat-1";
  const batch = writeBatch(firestore);
  batch.set(
    doc(firestore, "bookings", bookingId),
    salonBookingRecord(uid, bookingOverrides),
  );
  batch.set(doc(firestore, "bookingLocks", lockId), {
    lockId,
    bookingId,
    ownerUid: uid,
    serviceType: "salon",
    date: "2026-09-02",
    sessionId: "morning",
    startTime: "09:00",
    endTime: "12:00",
    status: "active",
    createdAt: serverTimestamp(),
    ...lockOverrides,
  });
  return batch.commit();
}

function salonBookingRecord(
  uid: string,
  bookingOverrides: Record<string, unknown> = {},
) {
  const bookingId = "booking-a";
  const lockId = "2026-09-02_morning_seat-1";
  return {
    id: bookingId,
    reference: "TAM-260902-0001",
    ownerUid: uid,
    serviceId: "salon-service",
    serviceNameSnapshot: "Natural hair care",
    serviceType: "salon",
    schedulingMode: "salon-session",
    date: "2026-09-02",
    startTime: "09:00",
    endTime: "12:00",
    sessionId: "morning",
    lockIds: [lockId],
    customer: {
      fullName: "Ada Okafor",
      phone: "08012345678",
      email: "ada@example.com",
      preferredContactMethod: "email",
      concern: "",
      hopes: "",
      concernDuration: "",
      priorProfessionalTreatment: "",
      productsTreatments: "",
      note: "",
    },
    serviceSnapshot: {
      id: "salon-service",
      name: "Natural hair care",
      category: "salon",
      price: 24000,
      duration: 60,
      preparation: "Arrive with accessible hair.",
    },
    extrasSnapshot: [],
    totalDuration: 60,
    subtotal: 24000,
    addressSnapshot: "Tamlois clinic",
    preparationSnapshot: "Arrive with accessible hair.",
    policyVersion: "v1",
    policyConsent: true,
    policyConsentRecord: {
      accepted: true,
      version: "v1",
      acceptedAt: "2026-08-28T10:00:00.000Z",
      sessionId: "session-a",
      policies: [
        {
          id: "appointments",
          title: "Appointment-only care",
          summary: "Appointments must be booked in advance.",
          version: 1,
        },
      ],
    },
    intakeResponses: {},
    status: "pending-confirmation",
    paymentStatus: "not-required",
    followUpDue: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...bookingOverrides,
  };
}

function serviceRecord(id = "salon-service", active = true) {
  return {
    id,
    slug: id,
    name: "Natural hair care",
    category: "salon",
    type: "service",
    summary: "Natural hair care.",
    description: "Natural hair care and treatment.",
    concerns: [],
    price: 24000,
    duration: 60,
    durationMinutes: 60,
    preparation: "Arrive with accessible hair.",
    expectation: "A structured care session.",
    aftercare: "Follow the care plan.",
    caution: "Tell the team about sensitivities.",
    consultationRequired: false,
    depositRequired: false,
    depositAmount: 0,
    active,
    archived: false,
    order: 1,
    displayOrder: 1,
    schedulingMode: "salon-session",
    image: "https://example.com/service.jpg",
    imageAlt: "Natural hair care",
    variations: [],
    placeholder: false,
    createdAt: new Date("2026-08-28T09:00:00Z"),
    updatedAt: new Date("2026-08-28T09:00:00Z"),
  };
}

function bookingSettingsRecord(
  useServerTimestamp = true,
  paymentOverrides: Record<string, unknown> = {},
) {
  return {
    address: "16, Road 21, Gowon Estate, Lagos, Nigeria",
    payment: {
      enabledModes: [
        "full",
        "deposit_percentage",
        "deposit_fixed",
        "clinic",
      ],
      defaultMode: "deposit_fixed",
      depositPercentage: 50,
      fixedDepositAmount: 12500,
      balanceDue: "at-clinic",
      holdMinutes: 15,
      approvalRequired: true,
      ...paymentOverrides,
    },
    updatedAt: useServerTimestamp
      ? serverTimestamp()
      : new Date("2026-08-29T09:00:00Z"),
  };
}

function policyRecord(
  id: string,
  title: string,
  displayOrder: number,
  useServerTimestamp = false,
) {
  const timestamp = useServerTimestamp
    ? serverTimestamp()
    : new Date("2026-08-29T09:00:00Z");
  return {
    id,
    title,
    summary: `${title} summary.`,
    displayOrder,
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
