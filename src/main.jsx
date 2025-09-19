// // src/main.jsx
// import React from "react";
// import { createRoot as createReactRootForDOMMount } from "react-dom/client";
// import { BrowserRouter as BrowserRouterForSPA } from "react-router-dom";
// import { QueryClient as ReactQueryClient, QueryClientProvider as ReactQueryProvider } from "@tanstack/react-query";
// import App from "./App.jsx";
// import "./index.css";
// import { startMSW as startMockServiceWorkerIfDev } from "./api/msw/browser.js";

// /* INITIALIZE A SINGLE REACT QUERY CLIENT FOR THE WHOLE APPLICATION TREE
//    (CACHES/DEDUPES NETWORK CALLS; SAFE TO SHARE VIA CONTEXT) */
// const reactQueryClientInstance = new ReactQueryClient();

// /* ACQUIRE THE ROOT DOM NODE AND PREPARE A CONCURRENT-READY REACT ROOT
//    (REQUIRED FOR REACT 18+ FEATURES AND STRICT MODE) */
// const reactRootForEntireApp = createReactRootForDOMMount(document.getElementById("root"));

// /* SELF-INVOKING BOOTSTRAP: OPTIONALLY START MSW IN DEVELOPMENT,
//    THEN RENDER THE APP WRAPPED WITH PROVIDERS AND THE ROUTER.
//    (NEVER BLOCK PRODUCTION IF MOCKS FAIL) */
// (async function bootstrapSinglePageApp() {
//   try {
//     // START THE MOCK API ONLY WHEN RUNNING LOCALLY; NO-OP IN PROD
//     await startMockServiceWorkerIfDev();
//   } catch (mockInitError) {
//     // DO NOT CRASH THE UI IF MOCKS FAIL; CONTINUE WITH REAL NETWORK
//     console.warn("[MSW] MOCK SERVICE WORKER FAILED TO START; CONTINUING:", mockInitError);
//   }

//   // MOUNT THE APPLICATION WITH ROUTER + DATA LAYER PROVIDERS
//   reactRootForEntireApp.render(
//     <React.StrictMode>
//       <ReactQueryProvider client={reactQueryClientInstance}>
//         <BrowserRouterForSPA>
//           <App />
//         </BrowserRouterForSPA>
//       </ReactQueryProvider>
//     </React.StrictMode>
//   );
// })();




























// src/main.jsx
import React from "react";
import { createRoot as createReactRootForDOMMount } from "react-dom/client";
import { BrowserRouter as BrowserRouterForSPA } from "react-router-dom";
import { QueryClient as ReactQueryClient, QueryClientProvider as ReactQueryProvider } from "@tanstack/react-query";
import App from "./App.jsx";
import "./index.css";

const reactQueryClientInstance = new ReactQueryClient();
const reactRootForEntireApp = createReactRootForDOMMount(document.getElementById("root"));

(async function bootstrapSinglePageApp() {
  // Decide which mock provider to use
  const provider = import.meta.env.VITE_API_PROVIDER ?? "msw";

  if (provider === "mirage") {
    const { startMirage } = await import("./api/mock/mirage/server.js");
    startMirage();
  } else {
    // Dev MSW is okay to keep; won't run in prod unless you set provider=msw
    try {
      const { startMSW } = await import("./api/msw/browser.js");
      await startMSW();
    } catch (e) {
      console.warn("[MSW] Could not start (ok in prod):", e);
    }
  }

  reactRootForEntireApp.render(
    <React.StrictMode>
      <ReactQueryProvider client={reactQueryClientInstance}>
        <BrowserRouterForSPA>
          <App />
        </BrowserRouterForSPA>
      </ReactQueryProvider>
    </React.StrictMode>
  );
})();
