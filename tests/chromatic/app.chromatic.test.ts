import { expect, test } from "@chromatic-com/playwright";
import { mockDandiset000409 } from "../helpers/dandi";
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

test("Dandiset page - 000409", async ({ page }) => {
  await stubTelemetry(page);
  // The DANDI API is stubbed with a fixture (tests/helpers/dandi.ts) so the
  // snapshot is stable — a live query would rebaseline whenever the archive
  // changes, and fail whenever the API is unreachable.
  await mockDandiset000409(page);
  await page.goto("/dandiset/000409");
  await expect(
    page.getByRole("heading", { name: "IBL Brain Wide Map" }),
  ).toBeVisible();
  // Wait for the lazy file listing too, so the archive is not taken mid-load.
  await expect(page.getByText("sub-example-01")).toBeVisible();
});
