import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const commerce = vi.hoisted(() => ({ listPublicProducts: vi.fn() }));
vi.mock("../commerce/provider", () => ({
  commerceProvider: {
    isDemo: true,
    listPublicProducts: commerce.listPublicProducts,
  },
}));
import ShopPage, { ProductLoadState } from "../pages/Shop";

describe("shop catalogue states", () => {
  beforeEach(() => commerce.listPublicProducts.mockReset());

  it("shows a loading skeleton while the catalogue is pending", async () => {
    let finish!: (products: never[]) => void;
    commerce.listPublicProducts.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(<MemoryRouter><ShopPage /></MemoryRouter>);
    expect(screen.getByLabelText("Loading products")).toBeInTheDocument();
    await act(async () => finish([]));
    expect(await screen.findByRole("heading", { name: "Products are coming soon" })).toBeInTheDocument();
  });

  it("shows a professional empty state", async () => {
    commerce.listPublicProducts.mockResolvedValue([]);
    render(<MemoryRouter><ShopPage /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Products are coming soon" })).toBeInTheDocument();
  });

  it("shows an error and retry action", async () => {
    render(<MemoryRouter><ProductLoadState state="error" retry={async () => undefined} /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Products could not be loaded" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
