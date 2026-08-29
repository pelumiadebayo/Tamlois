import { beforeEach, describe, expect, it } from "vitest";
import { policyConsentSnapshots } from "../lib/booking";
import { LocalBookingPolicyRepository } from "../repositories/bookingPolicyRepository";

describe("booking policy repository", () => {
  const key = "test-booking-policies";
  let repository: LocalBookingPolicyRepository;

  beforeEach(() => {
    localStorage.removeItem(key);
    repository = new LocalBookingPolicyRepository(key);
  });

  it("starts empty and creates the first public policy without seed data", async () => {
    await expect(repository.list()).resolves.toEqual([]);
    const created = await repository.createAsAdmin({
      title: "Appointment-only care",
      summary: "Appointments must be booked in advance.",
    });
    expect(created).toMatchObject({ displayOrder: 0, version: 1 });
    await expect(repository.list()).resolves.toHaveLength(1);
  });

  it("edits, versions and reorders policies", async () => {
    const first = await repository.createAsAdmin({
      title: "Appointments",
      summary: "Book ahead.",
    });
    const second = await repository.createAsAdmin({
      title: "Changes",
      summary: "Contact the clinic before changing an appointment.",
    });
    const updated = await repository.updateAsAdmin(first.id, {
      title: "Appointment-only care",
      summary: "Appointments must be booked in advance.",
    });
    expect(updated.version).toBe(2);

    await repository.reorderAsAdmin([second.id, first.id]);
    await expect(repository.list()).resolves.toMatchObject([
      { id: second.id, displayOrder: 0, version: 1 },
      { id: first.id, displayOrder: 1, version: 2 },
    ]);
  });

  it("permanently deletes only the policy and preserves an accepted snapshot", async () => {
    const created = await repository.createAsAdmin({
      title: "Privacy",
      summary: "Booking details are used to manage the appointment.",
    });
    const historicalSnapshot = policyConsentSnapshots([created]);

    await repository.deleteAsAdmin(created.id);

    await expect(repository.list()).resolves.toEqual([]);
    expect(historicalSnapshot).toEqual([
      {
        id: created.id,
        title: "Privacy",
        summary: "Booking details are used to manage the appointment.",
        version: 1,
      },
    ]);
  });
});
