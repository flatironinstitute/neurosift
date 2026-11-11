import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@css/fonts.css";
import "@css/tokens.css";
import "@css/index.css";
import App from "./App.tsx";
import { ToastProvider } from "@ui";
import "@css/nwb-table.css";
import { installGlobalErrorReporting } from "./util/reportError";
import { installStaleChunkReload } from "./util/reloadOnStaleChunk";
import { redirectLegacyUrl } from "./util/legacyUrl";

installGlobalErrorReporting();
installStaleChunkReload();
redirectLegacyUrl();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);
