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
      extraIds: ["extra-wig-installation"],
    });
    expect(bookingDraftRepository.load()).toMatchObject({
      sessionId: draft.sessionId,
      flowVersion: 3,
      category: "salon",
      step: 2,
      extraIds: ["extra-wig-installation"],
    });
  });

  it("migrates the former Extras and later steps into the six-step flow", () => {
    const draft = bookingDraftRepository.fresh();
    const { flowVersion: _flowVersion, ...legacyDraft } = draft;
    sessionStorage.setItem(
      "tamlois-booking-draft-v2",
      JSON.stringify({ ...legacyDraft, step: 3 }),
    );
    expect(bookingDraftRepository.load()).toMatchObject({
      flowVersion: 3,
      step: 2,
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

  it("allows three Salon holds in one session and rejects a fourth", () => {
    for (const sessionId of ["one", "two", "three"]) {
      bookingHoldRepository.create(
        {
          sessionId,
          date: "2030-09-02",
          startTime: "09:00",
          endTime: "12:00",
          serviceId: "svc-natural",
          category: "salon",
        },
        30,
        15,
        15,
        3,
      );
    }
    expect(() =>
      bookingHoldRepository.create(
        {
          sessionId: "four",
          date: "2030-09-02",
          startTime: "09:00",
          endTime: "12:00",
          serviceId: "svc-natural",
          category: "salon",
        },
        30,
        15,
        15,
        3,
      ),
    ).toThrow(/held by another guest/);
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
