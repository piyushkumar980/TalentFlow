// src/api/msw/browser.js
import { setupWorker as setupMockServiceWorkerFactory } from "msw/browser";
import { handlers as mockRequestHandlerList } from "./handlers.js";
import { seedIfEmpty as seedDatabaseIfMissing } from "../../lib/db.js";

// HOLDS THE SINGLETON WORKER INSTANCE ACROSS THE SESSION
let mockServiceWorkerInstance;

// GUARD FLAG TO PREVENT MULTIPLE INITIALIZATIONS IN THE SAME SESSION
let hasMockServiceWorkerStarted = false;

export async function startMSW() {
  // GUARDED EARLY-EXIT: RUNS ONLY ONCE AND ONLY IN DEVELOPMENT BUILDS
  if (hasMockServiceWorkerStarted || !import.meta.env.DEV) return;
  hasMockServiceWorkerStarted = true;

  try {
    // ENSURE THE LOCAL DB HAS STARTER DATA BEFORE THE WORKER INTERCEPTS REQUESTS
    await seedDatabaseIfMissing();

    // CREATE A NEW WORKER USING THE PROVIDED REQUEST HANDLERS
    mockServiceWorkerInstance = setupMockServiceWorkerFactory(...mockRequestHandlerList);

    // START THE WORKER WITH SANE DEFAULTS FOR LOCAL DEV ENVIRONMENTS
    await mockServiceWorkerInstance.start({
      // ALLOW NON-MOCKED REQUESTS TO PASS THROUGH SO THE APP DOESN'T BREAK
      onUnhandledRequest: "bypass",
      // VITE SERVES THE SERVICE WORKER FROM THE PUBLIC ROOT; SPECIFY THE PATH EXPLICITLY
      serviceWorker: {
        url: "/mockServiceWorker.js",
      },
    });

    // FRIENDLY CONSOLE SIGNAL TO CONFIRM THE WORKER IS ACTIVE
    console.info("[MSW] Service worker started");
  } catch (initializationError) {
    // NON-FATAL: LOG AND CONTINUE WITHOUT MOCKS IF SOMETHING GOES WRONG
    console.warn("[MSW] Failed to start mock service worker:", initializationError);
  }
}
