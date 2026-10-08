import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@css/index.css";
import App from "./App.tsx";
import "@css/nwb-table-2.css";
import "@css/nwb-table.css";
import { installGlobalErrorReporting } from "./util/reportError";

installGlobalErrorReporting();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
