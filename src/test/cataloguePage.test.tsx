import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { services as seedServices } from "../data/content";

const useServicesMock = vi.hoisted(() => vi.fn());

vi.mock("../hooks/useServices", () => ({
  useServices: useServicesMock,
}));

import { ServicesPage } from "../pages/Catalogue";

describe("Firebase-backed services page", () => {
  it("renders services after the asynchronous catalogue finishes loading", () => {
    useServicesMock.mockReturnValue({
      services: [],
      loading: true,
      error: "",
      retry: vi.fn(),
    });
    const view = render(
      <MemoryRouter>
        <ServicesPage />
      </MemoryRouter>,
    );

    useServicesMock.mockReturnValue({
      services: [
        {
          ...seedServices[0],
          id: "admin-created-service",
          name: "Admin-created service",
        },
      ],
      loading: false,
      error: "",
      retry: vi.fn(),
    });
    view.rerender(
      <MemoryRouter>
        <ServicesPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Admin-created service" }),
    ).toBeVisible();
  });
});
