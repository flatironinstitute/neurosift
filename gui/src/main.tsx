/* eslint-disable @typescript-eslint/no-explicit-any */
import * as ReactDOM from "react-dom/client";

import App from "./app/App";
import "./localStyles.css";
import "./index.css";
import "./table.css";
import "./neurosift-lib/css/nwb-table.css";
import "./neurosift-lib/css/nwb-table-2.css";

// Keep track of the console error messages
// to be inspected by the tests
declare global {
  interface Window {
    testErrors: any[];
  }
}
window.testErrors = [];
const oldConsoleError = console.error;
console.error = (...args) => {
  oldConsoleError(...args);
  window.testErrors.push(args);
};

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);
root.render(
  // <StrictMode>
  <App />,
  // </StrictMode>
);
