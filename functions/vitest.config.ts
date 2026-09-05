import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // The Firestore emulator intentionally retries contended transactions.
    // Concurrency assertions need room for those retries on slower CI runners.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
