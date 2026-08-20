import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CareLoop } from "../components/CareLoop";
import { homeOfferings } from "../data/content";

function renderLoop() {
  return render(
    <MemoryRouter>
      <CareLoop offerings={homeOfferings} />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
});

describe("Tamlois Care Loop", () => {
  it("keeps the brand promise stable and starts with Natural Hair Salon", () => {
    renderLoop();
    expect(
      screen.getByRole("heading", {
        name: "Understand your scalp. Care for your hair with confidence.",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /^01 Natural Hair Salon$/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("heading", {
        name: "Professional care & styling for natural hair",
      }),
    ).toBeVisible();
  });

  it("selects an offering manually and exposes the correct CTA", async () => {
    const user = userEvent.setup();
    renderLoop();
    await user.click(
      screen.getByRole("button", { name: /^02 Trichology Care$/ }),
    );
    expect(
      screen.getByRole("heading", {
        name: "Clinical insight for healthier hair and scalp",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", {
        name: /^Book a trichology consultation$/,
      }),
    ).toHaveAttribute("href", "/booking?category=trichology");
  });

  it("uses the image-card arrow as its action and advances from the controls", async () => {
    const user = userEvent.setup();
    renderLoop();
    const salonCardAction = screen.getByRole("link", {
      name: "Book a salon service from offering card",
    });
    expect(salonCardAction).toHaveAttribute("href", "/booking?category=salon");
    expect(salonCardAction.querySelector(".lucide-calendar-days")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Pause Care Loop" }));
    expect(screen.getByRole("button", { name: "Play Care Loop" })).toBeVisible();
    await user.click(
      screen.getByRole("button", {
        name: "Show next offering and resume: Trichology Care",
      }),
    );
    expect(
      screen.getByRole("button", { name: "Pause Care Loop" }),
    ).toHaveTextContent("");
    expect(
      screen.getByRole("heading", {
        name: "Clinical insight for healthier hair and scalp",
      }),
    ).toBeVisible();
    const trichologyCardAction = screen.getByRole("link", {
      name: "Book a trichology consultation from offering card",
    });
    expect(trichologyCardAction).toHaveAttribute(
      "href",
      "/booking?category=trichology",
    );
    expect(
      trichologyCardAction.querySelector(".lucide-calendar-days"),
    ).not.toBeNull();
  });

  it("auto-advances on desktop and pauses on demand", () => {
    vi.useFakeTimers();
    renderLoop();
    act(() => vi.advanceTimersByTime(6500));
    expect(
      screen.getByRole("button", { name: /^02 Trichology Care$/ }),
    ).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Pause Care Loop" }));
    act(() => vi.advanceTimersByTime(13000));
    expect(
      screen.getByRole("button", { name: /^02 Trichology Care$/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("auto-advances on mobile and keeps playback controls available", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({
        matches: query === "(max-width: 767px)",
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }),
    });
    vi.useFakeTimers();
    renderLoop();
    expect(
      screen.getByRole("button", { name: "Pause Care Loop" }),
    ).not.toBeDisabled();
    act(() => vi.advanceTimersByTime(6500));
    expect(
      screen.getByRole("button", { name: /^02 Trichology Care$/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("resumes advancement when Play is explicitly requested", () => {
    vi.useFakeTimers();
    renderLoop();
    const region = screen.getByRole("region", { name: "Tamlois Care Loop" });
    fireEvent.mouseEnter(region);
    fireEvent.click(screen.getByRole("button", { name: "Pause Care Loop" }));
    const play = screen.getByRole("button", { name: "Play Care Loop" });
    play.focus();
    fireEvent.click(play);
    act(() => vi.advanceTimersByTime(6500));
    expect(
      screen.getByRole("button", { name: /^02 Trichology Care$/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("supports arrow-key selection and focuses the next tab", () => {
    renderLoop();
    const salon = screen.getByRole("button", {
      name: /Natural Hair Salon/,
    });
    salon.focus();
    fireEvent.keyDown(salon, { key: "ArrowDown" });
    const trichology = screen.getByRole("button", {
      name: /^02 Trichology Care$/,
    });
    expect(trichology).toHaveFocus();
    expect(trichology).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps every offering available as semantic fallback navigation", () => {
    renderLoop();
    const fallback = screen.getByRole("navigation", {
      name: "All Tamlois offerings",
    });
    expect(fallback.querySelectorAll("a")).toHaveLength(4);
    expect(screen.getByRole("link", { name: "Gallery" })).toHaveAttribute(
      "href",
      "/gallery",
    );
  });

  it("shows an accessible fallback when the active image cannot load", () => {
    renderLoop();
    fireEvent.error(
      screen.getByAltText(/healthy natural textured hair, licensed placeholder/),
    );
    expect(screen.getByText("Image unavailable")).toBeVisible();
  });

  it("uses the woven natural-hair image for the Gallery offering", async () => {
    const user = userEvent.setup();
    renderLoop();
    await user.click(
      screen.getByRole("button", { name: /^04 Gallery & Results$/ }),
    );
    const galleryImage = screen.getByAltText(
      /woven natural hairstyle with neatly sectioned twists/i,
    );
    expect(galleryImage).toHaveAttribute(
      "src",
      `${import.meta.env.BASE_URL}gallery-image.jpg`,
    );
  });

  it("disables autoplay when reduced motion is requested", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }),
    });
    vi.useFakeTimers();
    renderLoop();
    expect(
      screen.getByRole("button", { name: "Play Care Loop" }),
    ).toBeDisabled();
    act(() => vi.advanceTimersByTime(13000));
    expect(
      screen.getByRole("button", { name: /^01 Natural Hair Salon$/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
