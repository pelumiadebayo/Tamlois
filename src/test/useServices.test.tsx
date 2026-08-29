import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/firebase", () => ({
  firebaseEnabled: true,
  firebaseMode: true,
}));
vi.mock("../repositories/publicServices", () => ({
  listPublicServices: vi.fn().mockResolvedValue([]),
}));

import { useServices } from "../hooks/useServices";

describe("Firebase service catalogue hydration", () => {
  it("keeps an empty Firestore catalogue empty without fixture fallback", async () => {
    localStorage.setItem("tamlois-services", "[]");
    const { result } = renderHook(() => useServices());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.services).toEqual([]);
    expect(result.current.error).toBe("");
  });
});
