
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
