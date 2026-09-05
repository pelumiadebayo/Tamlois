import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAYMENT_SETTINGS,
  calculatePayableAmountKobo,
  canTransition,
  nairaToKobo,
  salonSeatIds,
  trichologyLockIds,
} from "./domain.js";

describe("authoritative payment calculations", () => {
  it("converts whole naira to integer kobo", () => {
    expect(nairaToKobo(24_000)).toBe(2_400_000);
    expect(() => nairaToKobo(24_000.5)).toThrow(
      "PRICE_CONFIGURATION_INVALID",
    );
  });

  it("calculates percentage, fixed and full payments without floats", () => {
    const settings = {
      ...DEFAULT_PAYMENT_SETTINGS,
      enabledModes: [
        "full",
        "deposit_percentage",
        "deposit_fixed",
        "clinic",
      ] as const,
      depositPercentage: 35,
      fixedDepositAmountKobo: 850_000,
    };
    expect(calculatePayableAmountKobo(2_400_000, "full", settings)).toBe(
      2_400_000,
    );
    expect(
      calculatePayableAmountKobo(
        2_400_000,
        "deposit_percentage",
        settings,
      ),
    ).toBe(840_000);
    expect(
      calculatePayableAmountKobo(2_400_000, "deposit_fixed", settings),
    ).toBe(850_000);
    expect(calculatePayableAmountKobo(2_400_000, "clinic", settings)).toBe(0);
  });

  it("rejects a disabled client-selected payment option", () => {
    expect(() =>
      calculatePayableAmountKobo(2_400_000, "deposit_fixed", {
        ...DEFAULT_PAYMENT_SETTINGS,
        enabledModes: ["full"],
      }),
    ).toThrow("PAYMENT_OPTION_DISABLED");
  });
});

describe("deterministic capacity and state transitions", () => {
  it("creates exactly three salon seat IDs", () => {
    expect(salonSeatIds("2026-09-10", "morning")).toEqual([
      "2026-09-10_morning_seat-1",
      "2026-09-10_morning_seat-2",
      "2026-09-10_morning_seat-3",
    ]);
  });

  it("locks service duration plus the configured buffer", () => {
    expect(trichologyLockIds("2026-09-10", "09:00", 90)).toEqual([
      "2026-09-10_09-00",
      "2026-09-10_09-30",
      "2026-09-10_10-00",
      "2026-09-10_10-30",
    ]);
  });

  it("allows only canonical booking transitions", () => {
    expect(canTransition("awaiting-payment", "confirmed")).toBe(true);
    expect(canTransition("awaiting-payment", "pending-confirmation")).toBe(
      true,
    );
    expect(canTransition("pending-confirmation", "confirmed")).toBe(true);
    expect(canTransition("awaiting-payment", "completed")).toBe(false);
    expect(canTransition("confirmed", "completed")).toBe(true);
    expect(canTransition("cancelled", "confirmed")).toBe(false);
  });
});
