// src/api/msw/browser.js
import { setupWorker as setupMockServiceWorkerFactory } from "msw/browser";
import { handlers as mockRequestHandlerList } from "./handlers.js";
import { seedIfEmpty as seedDatabaseIfMissing } from "../../lib/db.js";

// Singleton across the session
let mockServiceWorkerInstance;
let hasMockServiceWorkerStarted = false;

/**
 * Start MSW in any environment when explicitly enabled via env:
 *   VITE_ENABLE_MSW = "1"
 * This allows production deploys (Vercel) to use mock data.
 */
export async function startMSW() {
  // Only run in the browser
  if (typeof window === "undefined") return;

  // Explicit feature flag for ALL envs (dev/preview/prod)
  const isEnabled = import.meta.env.VITE_ENABLE_MSW === "1";

  // Guard: already started or not enabled → do nothing
  if (hasMockServiceWorkerStarted || !isEnabled) return;
  hasMockServiceWorkerStarted = true;

  try {
    // Seed local DB before intercepting requests (if your app needs it)
    if (typeof seedDatabaseIfMissing === "function") {
      await seedDatabaseIfMissing();
    }

    // Create worker with your handlers
    mockServiceWorkerInstance = setupMockServiceWorkerFactory(
      ...mockRequestHandlerList
    );

    // IMPORTANT: point to the worker served from /public on Vercel
    await mockServiceWorkerInstance.start({
      serviceWorker: { url: "/mockServiceWorker.js" },
      onUnhandledRequest: "bypass",
    });

    console.info("[MSW] Service worker started (env-flag enabled)");
  } catch (err) {
    console.warn("[MSW] Failed to start mock service worker:", err);
  }
}
