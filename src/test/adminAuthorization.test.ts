import { describe, expect, it } from "vitest";
import {
  hasConfiguredOwnerUid,
  isAuthorizedAdminUid,
  UNAUTHORIZED_ADMIN_ACCOUNT_MESSAGE,
} from "../lib/adminAuthorization";

describe("admin UID routing guard", () => {
  it("allows only the matching configured owner UID", () => {
    expect(isAuthorizedAdminUid("owner-uid", "owner-uid")).toBe(true);
    expect(isAuthorizedAdminUid("another-uid", "owner-uid")).toBe(false);
  });

  it("fails closed when the application owner UID is missing", () => {
    expect(hasConfiguredOwnerUid("")).toBe(false);
    expect(isAuthorizedAdminUid("owner-uid", "")).toBe(false);
  });

  it("provides a clear message for an authenticated non-owner", () => {
    expect(UNAUTHORIZED_ADMIN_ACCOUNT_MESSAGE).toMatch(
      /signed in.*not the authorised Tamlois owner account/i,
    );
  });
});
