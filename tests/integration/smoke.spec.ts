import { expect, test } from "@playwright/test";
import { stubTelemetry } from "../helpers/network";

test.beforeEach(async ({ page }) => {
  await stubTelemetry(page);
});

test("home page renders the app shell and the archive cards", async ({
  page,
}) => {
  await page.goto("/");
  // The app-bar title is a Typography rendered as a div, not a heading.
  await expect(page.getByText("Neurosift (v2)")).toBeVisible();
  for (const label of ["Browse DANDI", "Browse EMBER", "Browse OpenNeuro"]) {
    await expect(page.getByRole("button", { name: label })).toBeVisible();
  }
});

test("settings icon navigates to the settings page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible();
});

test("unknown routes redirect to the home page", async ({ page }) => {
  await page.goto("/no-such-page");
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: "Welcome to Neurosift" }),
  ).toBeVisible();
});

test("api keys entered on the settings page persist to localStorage", async ({
  page,
}) => {
  await page.goto("/settings");
  await page.getByLabel("DANDI API Key", { exact: true }).fill("test-key");
  await expect(
    page.getByText("API key saved. Please reload the page"),
  ).toBeVisible();
  const stored = await page.evaluate(() =>
    window.localStorage.getItem("dandiApiKey"),
  );
  expect(stored).toBe("test-key");
});
