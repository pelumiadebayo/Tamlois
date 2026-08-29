import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
} from "firebase/app-check";
import {
  connectAuthEmulator,
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  type User,
} from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const firebaseMode = import.meta.env.VITE_APP_MODE === "firebase";
const requiredFirebaseConfig = {
  VITE_FIREBASE_API_KEY: config.apiKey,
  VITE_FIREBASE_AUTH_DOMAIN: config.authDomain,
  VITE_FIREBASE_PROJECT_ID: config.projectId,
  VITE_FIREBASE_STORAGE_BUCKET: config.storageBucket,
  VITE_FIREBASE_MESSAGING_SENDER_ID: config.messagingSenderId,
  VITE_FIREBASE_APP_ID: config.appId,
};
export const missingFirebaseConfig = Object.entries(requiredFirebaseConfig)
  .filter(([, value]) => !String(value ?? "").trim())
  .map(([name]) => name);
export const firebaseConfigurationError = firebaseMode && missingFirebaseConfig.length
  ? `Firebase mode is missing required configuration: ${missingFirebaseConfig.join(", ")}.`
  : "";
export const firebaseEnabled = firebaseMode && !firebaseConfigurationError;
// This browser-visible value improves routing and feedback only. Firestore
// Rules independently enforce the owner UID and remain authoritative.
export const firebaseAdminUid = String(
  import.meta.env.VITE_FIREBASE_ADMIN_UID ?? "",
).trim();
/** @deprecated Use firebaseAdminUid. Kept temporarily for imported call sites. */
export const firebaseOwnerUid = firebaseAdminUid;
export let firebaseApp: FirebaseApp | null = null;
export let auth: ReturnType<typeof getAuth> | null = null;
export let db: ReturnType<typeof getFirestore> | null = null;
export let appCheck: AppCheck | null = null;

if (firebaseEnabled) {
  firebaseApp = initializeApp(config);
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
  if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true") {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
  }
  const appCheckKey = import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY;
  if (appCheckKey)
    appCheck = initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaV3Provider(appCheckKey),
      isTokenAutoRefreshEnabled: true,
    });
}

export class BookingAuthenticationError extends Error {
  constructor(
    public readonly code:
      | "ANONYMOUS_AUTH_FAILED"
      | "ANONYMOUS_AUTH_NOT_ENABLED"
      | "ADMIN_SESSION_ACTIVE",
    message: string,
  ) {
    super(message);
    this.name = "BookingAuthenticationError";
  }
}

function waitForAuthenticationInitialization() {
  if (!auth) return Promise.resolve<User | null>(null);
  return new Promise<User | null>((resolve, reject) => {
    let unsubscribe: () => void = () => {};
    unsubscribe = onAuthStateChanged(
      auth!,
      (user) => {
        unsubscribe();
        resolve(user);
      },
      (error) => {
        unsubscribe();
        reject(error);
      },
    );
  });
}

/**
 * Creates or reuses the invisible anonymous Firebase session used to own a
 * public booking. Email/password sessions are deliberately not converted or
 * signed out here because administrator authentication is a separate journey.
 */
export async function ensureAnonymousBookingUser() {
  if (!firebaseEnabled || !auth)
    throw new BookingAuthenticationError(
      "ANONYMOUS_AUTH_FAILED",
      "Booking authentication is unavailable. Please reload and try again.",
    );
  try {
    const initializedUser = await waitForAuthenticationInitialization();
    if (initializedUser?.isAnonymous) return initializedUser;
    if (initializedUser)
      throw new BookingAuthenticationError(
        "ADMIN_SESSION_ACTIVE",
        "An administrator session is active in this browser. Sign out of the admin area before starting a customer booking.",
      );
    const credential = await signInAnonymously(auth);
    return credential.user;
  } catch (error) {
    if (error instanceof BookingAuthenticationError) throw error;
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";
    if (
      code === "auth/operation-not-allowed" ||
      code === "auth/admin-restricted-operation"
    )
      throw new BookingAuthenticationError(
        "ANONYMOUS_AUTH_NOT_ENABLED",
        "Online booking is not enabled yet. The clinic owner needs to enable Anonymous sign-in in Firebase Authentication, then reload this page.",
      );
    if (import.meta.env.DEV)
      console.error("Anonymous booking authentication failed", error);
    throw new BookingAuthenticationError(
      "ANONYMOUS_AUTH_FAILED",
      "We could not start a secure booking session. Check your connection and try again.",
    );
  }
}
