import { beforeEach, describe, expect, it } from "vitest";
import {
  bookingDraftRepository,
  bookingHoldRepository,
} from "../repositories/bookingSessionRepository";

describe("guest booking session repository", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("persists one anonymous draft without customer authentication", () => {
    const draft = bookingDraftRepository.fresh();
    bookingDraftRepository.save({
      ...draft,
      category: "salon",
      step: 2,
      extraIds: ["extra-steam"],
    });
    expect(bookingDraftRepository.load()).toMatchObject({
      sessionId: draft.sessionId,
      category: "salon",
      step: 2,
      extraIds: ["extra-steam"],
    });
  });

  it("discards expired drafts and their sensitive intake responses", () => {
    const draft = bookingDraftRepository.fresh();
    sessionStorage.setItem(
      "tamlois-booking-draft-v2",
      JSON.stringify({
        ...draft,
        updatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
        intakeResponses: { "private-history": "sensitive" },
      }),
    );
    const loaded = bookingDraftRepository.load();
    expect(loaded.sessionId).not.toBe(draft.sessionId);
    expect(loaded.intakeResponses).toEqual({});
  });

  it("creates a duration-aware hold and blocks a conflicting session", () => {
    const first = bookingHoldRepository.create(
      {
        sessionId: "one",
        date: "2030-09-02",
        startTime: "10:00",
        endTime: "11:00",
        serviceId: "svc-consult",
      },
      30,
      15,
      15,
    );
    expect(first.lockIds).toEqual([
      "2030-09-02_1000",
      "2030-09-02_1030",
      "2030-09-02_1100",
    ]);
    expect(() =>
      bookingHoldRepository.create(
        {
          sessionId: "two",
          date: "2030-09-02",
          startTime: "10:30",
          endTime: "11:30",
          serviceId: "svc-analysis",
        },
        30,
        15,
        15,
      ),
    ).toThrow(/held by another guest/);
  });

  it("releases a previous hold when the same session chooses again", () => {
    const first = bookingHoldRepository.create(
      {
        sessionId: "one",
        date: "2030-09-02",
        startTime: "10:00",
        endTime: "11:00",
        serviceId: "svc-consult",
      },
      30,
      15,
      15,
    );
    const second = bookingHoldRepository.create(
      {
        sessionId: "one",
        date: "2030-09-02",
        startTime: "12:00",
        endTime: "13:00",
        serviceId: "svc-consult",
      },
      30,
      15,
      15,
    );
    expect(bookingHoldRepository.get(first.id)?.status).toBe("released");
    expect(bookingHoldRepository.get(second.id)?.status).toBe("active");
  });

  it("expires stale holds and converts successful ones", () => {
    localStorage.setItem(
      "tamlois-booking-holds",
      JSON.stringify([
        {
          id: "expired",
          sessionId: "one",
          date: "2020-01-01",
          startTime: "10:00",
          endTime: "11:00",
          serviceId: "svc",
          lockIds: ["x"],
          expiresAt: "2020-01-01T10:00:00.000Z",
          status: "active",
        },
      ]),
    );
    expect(bookingHoldRepository.listActive()).toEqual([]);
    const hold = bookingHoldRepository.create(
      {
        sessionId: "two",
        date: "2030-09-02",
        startTime: "12:00",
        endTime: "13:00",
        serviceId: "svc",
      },
      30,
      0,
      15,
    );
    bookingHoldRepository.convert(hold.id);
    expect(bookingHoldRepository.get(hold.id)?.status).toBe("converted");
  });
});
