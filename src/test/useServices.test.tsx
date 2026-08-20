import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useServices } from "../hooks/useServices";

describe("main service catalogue hydration", () => {
  beforeEach(() => localStorage.clear());

  it("restores the six main services when the local catalogue is empty", async () => {
    localStorage.setItem("tamlois-services", "[]");
    const { result } = renderHook(() => useServices());
    await waitFor(() =>
      expect(
        result.current.services.filter(
          (service) => service.active && service.type !== "package",
        ),
      ).toHaveLength(6),
    );
    expect(
      result.current.services
        .filter((service) => service.active && service.type !== "package")
        .map((service) => service.name),
    ).toEqual([
      "Scalp analysis",
      "Trichology consultation",
      "Scalp therapy",
      "Hair-loss management",
      "Hair treatments",
      "Natural hair care",
    ]);
  });
});
