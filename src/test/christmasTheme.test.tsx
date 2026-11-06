import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import {
  ChristmasAnnouncement,
  ChristmasBadge,
  ChristmasHeroDecor,
  parseChristmasThemeEnabled,
  type ChristmasThemeConfig,
} from "../components/seasonal";

function config(enabled: boolean): ChristmasThemeConfig {
  return {
    enabled,
    announcement: "A season of care — holiday appointments are now open",
    announcementCta: "Book early",
    announcementHref: "/booking",
    campaignLabel: "Christmas at Tamlois",
    bookingMessage: "Plan your December hair & scalp care early",
    badgeText: "Holiday care",
  };
}

afterEach(cleanup);

describe("Christmas homepage feature flag", () => {
  it("is disabled when the value is missing or false", () => {
    expect(parseChristmasThemeEnabled(undefined)).toBe(false);
    expect(parseChristmasThemeEnabled("false")).toBe(false);
    expect(parseChristmasThemeEnabled("")).toBe(false);
  });

  it("is enabled only by an explicit true value", () => {
    expect(parseChristmasThemeEnabled("true")).toBe(true);
    expect(parseChristmasThemeEnabled(" TRUE ")).toBe(true);
    expect(parseChristmasThemeEnabled("1")).toBe(false);
  });
});

describe("Christmas homepage components", () => {
  it("does not render the announcement when disabled", () => {
    render(
      <MemoryRouter>
        <ChristmasAnnouncement config={config(false)} />
      </MemoryRouter>,
    );
    expect(
      screen.queryByLabelText("Christmas booking announcement"),
    ).not.toBeInTheDocument();
  });

  it("renders the enabled announcement with the booking route", () => {
    render(
      <MemoryRouter>
        <ChristmasAnnouncement config={config(true)} />
      </MemoryRouter>,
    );
    expect(
      screen.getByText("A season of care — holiday appointments are now open"),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Book early" })).toHaveAttribute(
      "href",
      "/booking",
    );
  });

  it("renders the holiday badge only when enabled", () => {
    const { rerender } = render(<ChristmasBadge config={config(false)} />);
    expect(screen.queryByText("Holiday care")).not.toBeInTheDocument();
    rerender(<ChristmasBadge config={config(true)} />);
    expect(screen.getByText("Holiday care")).toBeVisible();
  });

  it("keeps generated botanical assets decorative and non-interactive", () => {
    const { container } = render(<ChristmasHeroDecor config={config(true)} />);
    const decor = container.querySelector(".christmas-hero-decor");
    const images = Array.from(container.querySelectorAll("img"));

    expect(decor).toHaveAttribute("aria-hidden", "true");
    expect(images).toHaveLength(2);
    images.forEach((image) => {
      expect(image).toHaveAttribute("alt", "");
      expect(image).toHaveAttribute("draggable", "false");
    });
  });
});
