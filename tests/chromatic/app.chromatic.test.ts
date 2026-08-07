import { expect, test } from "@chromatic-com/playwright";
import { stubTelemetry } from "../helpers/network";

// Each test archives the page it ends on; Chromatic then renders those archives
// and diffs them against the accepted baselines. Assertions here exist to pin
// the page to a settled state before the archive is taken, not to check pixels.

test("Home page", async ({ page }) => {
  await stubTelemetry(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Welcome to Neurosift" }),
  ).toBeVisible();
  // The build-time footer is the last thing to render (it dynamically imports
  // build-info.json); waiting on it keeps the archive from catching a partial
  // page. Its text itself is excluded from the diff via data-chromatic="ignore".
  await expect(page.getByText(/^Built:/)).toBeVisible();
});

test("Home page - highlighted views expanded", async ({ page }) => {
  await stubTelemetry(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Show Highlighted Views" }).click();
  await expect(
    page.getByRole("button", { name: "Hide Highlighted Views" }),
  ).toBeVisible();
});

test("Settings page", async ({ page }) => {
  await stubTelemetry(page);
  // Navigated to directly rather than through the app bar so the snapshot does
  // not depend on the home page rendering first.
  await page.goto("/settings");
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Neurosift API Key")).toHaveValue("");
});
