import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@css/index.css";
import App from "./App.tsx";
import "@css/nwb-table-2.css";
import "@css/nwb-table.css";
import { Analytics } from "@vercel/analytics/react";

// Track if we've sent analytics
let analyticsSent = false;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <Analytics
      beforeSend={(event) => {
        if (event.type === "pageview") {
          if (analyticsSent) return null;
          analyticsSent = true;
        }
        return event;
      }}
    />
  </StrictMode>,
);
