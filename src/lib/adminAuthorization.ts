export const OWNER_UID_NOT_CONFIGURED_MESSAGE =
  "Administrator access is not configured. Add the owner's Firebase Authentication UID to the application configuration and Firestore Rules.";

export const UNAUTHORIZED_ADMIN_ACCOUNT_MESSAGE =
  "This Firebase account is signed in, but it is not the authorised Tamlois owner account.";

export function hasConfiguredOwnerUid(ownerUid: string) {
  return ownerUid.trim().length > 0;
}

export function isAuthorizedAdminUid(
  authenticatedUid: string | null | undefined,
  ownerUid: string,
) {
  return (
    hasConfiguredOwnerUid(ownerUid) &&
    typeof authenticatedUid === "string" &&
    authenticatedUid === ownerUid
  );
}
