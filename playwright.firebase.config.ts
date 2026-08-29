import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "firebase.spec.ts",
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-firebase" }]],
  use: {
    baseURL: "http://127.0.0.1:4174",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4174",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: true,
    timeout: 120000,
    env: {
      ...process.env,
      VITE_APP_MODE: "firebase",
      VITE_USE_FIREBASE_EMULATORS: "true",
      VITE_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY || "demo-api-key",
      VITE_FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN || "demo-tamlois-owner-auth.firebaseapp.com",
      VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID || "demo-tamlois-owner-auth",
      VITE_FIREBASE_STORAGE_BUCKET: process.env.VITE_FIREBASE_STORAGE_BUCKET || "demo-tamlois-owner-auth.appspot.com",
      VITE_FIREBASE_MESSAGING_SENDER_ID: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "100000000000",
      VITE_FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID || "1:100000000000:web:tamlois-emulator",
      VITE_FIREBASE_ADMIN_UID: "0CZw1AFTjMXudXtvFST0z2ufET02",
    },
  },
});
