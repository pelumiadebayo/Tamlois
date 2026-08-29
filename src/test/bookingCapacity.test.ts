import { describe, expect, it } from "vitest";
import {
  MAX_TRICHOLOGY_LOCKS,
  blockUnitIds,
  isSunday,
  lagosDateKey,
  overlappingBlockUnitIds,
  salonSeatLockIds,
  trichologyCandidateStartTimes,
  trichologyUnitLockIds,
} from "../lib/bookingCapacity";

describe("deterministic booking capacity helpers", () => {
  it("creates exactly three deterministic Salon seat IDs", () => {
    expect(salonSeatLockIds("2026-09-02", "morning")).toEqual([
      "2026-09-02_morning_seat-1",
      "2026-09-02_morning_seat-2",
      "2026-09-02_morning_seat-3",
    ]);
  });

  it("covers duration and buffer with consecutive Trichology units", () => {
    expect(trichologyUnitLockIds("2026-09-02", "09:00", 90, 15)).toEqual([
      "2026-09-02_09-00",
      "2026-09-02_09-30",
      "2026-09-02_10-00",
      "2026-09-02_10-30",
    ]);
    expect(trichologyUnitLockIds("2026-09-02", "09:00", 240)).toHaveLength(
      MAX_TRICHOLOGY_LOCKS,
    );
  });

  it("uses the Lagos calendar date instead of the browser timezone", () => {
    expect(lagosDateKey(new Date("2026-09-01T23:30:00.000Z"))).toBe(
      "2026-09-02",
    );
  });

  it("closes Sundays from stable date keys", () => {
    expect(isSunday("2026-09-06")).toBe(true);
    expect(isSunday("2026-09-07")).toBe(false);
  });

  it("rounds partial blocks outward to every overlapping unit", () => {
    expect(
      overlappingBlockUnitIds("2026-09-02", "09:15", "10:15"),
    ).toEqual([
      "2026-09-02_09-00",
      "2026-09-02_09-30",
      "2026-09-02_10-00",
    ]);
    expect(blockUnitIds("2026-09-02", "09:00", "10:00")).toHaveLength(2);
  });

  it("removes blocked and occupied Trichology starts", () => {
    const now = new Date("2026-08-28T08:00:00.000Z");
    const slots = trichologyCandidateStartTimes(
      "2026-09-02",
      60,
      new Set(["2026-09-02_09-30"]),
      new Set(["2026-09-02_11-00"]),
      now,
    );
    expect(slots).not.toContain("09:00");
    expect(slots).not.toContain("09:30");
    expect(slots).not.toContain("10:00");
    expect(slots).not.toContain("10:30");
    expect(slots).toContain("11:30");
  });
});

