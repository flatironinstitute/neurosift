import { expect, test, type Page } from "@playwright/test";

// Saved links, old and current, loaded against live DANDI, EMBER and OpenNeuro data.
const asset = (id: string) =>
  `https://api.dandiarchive.org/api/assets/${id}/download/`;
const WM = `url=${asset("65a7e913-45c7-48db-bf19-b9f5e910110a")}&dandisetId=000673&dandisetVersion=0.250122.0110`;
const PSTH_FILE = `url=${asset("c04f6b30-82bf-40e1-9210-34f0bcd8be24")}&dandisetId=000409&dandisetVersion=draft`;
const EYE_FILE = `url=${asset("407d6e5f-2a16-4879-b38f-b74cad7b9e24")}&dandisetId=000871&dandisetVersion=draft`;

const params = (page: Page) => new URL(page.url()).searchParams;

const expectPath = async (page: Page, pathname: string) =>
  expect.poll(() => new URL(page.url()).pathname).toBe(pathname);

const objectTab = (page: Page, id: string) =>
  page.locator(`[id=${JSON.stringify(`file-objects-tab-${id}`)}]`);

const expectObjectTab = async (page: Page, id: string, shows: string) => {
  await expect(objectTab(page, id)).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("tabpanel").filter({ hasText: shows }).last(),
  ).toBeVisible();
};

test.describe("datasets", () => {
  for (const link of [
    "/?p=/dandiset&dandisetId=000673&dandisetVersion=0.250122.0110",
    "/dandiset/000673?dandisetVersion=0.250122.0110",
  ])
    test(`a DANDI Dandiset at a version: ${link}`, async ({ page }) => {
      await page.goto(link);
      await expectPath(page, "/dandiset/000673");
      expect(params(page).get("dandisetVersion")).toBe("0.250122.0110");
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Control of working memory",
      );
      await expect(page.locator("main, body").first()).toContainText(
        "0.250122.0110",
      );
    });

  for (const link of [
    "/?p=/ember-dandiset&emberDandisetId=000207",
    "/ember-dandiset/000207",
  ])
    test(`an EMBER Dandiset: ${link}`, async ({ page }) => {
      await page.goto(link);
      await expectPath(page, "/ember-dandiset/000207");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "NDX Wearables",
      );
    });

  for (const [link, file] of [
    [
      "/dandiset/000673?dandisetVersion=0.250122.0110&tab=sub-1/sub-1_ses-1_ecephys%2Bimage.nwb|",
      "sub-1_ses-1_ecephys+image.nwb",
    ],
    [
      "/ember-dandiset/000207?tab=sub-synthetic-pre-release-0-1/sub-synthetic-pre-release-0-1.nwb|",
      "sub-synthetic-pre-release-0-1.nwb",
    ],
  ])
    test(`a Dandiset with a file open: ${link}`, async ({ page }) => {
      await page.goto(link);
      await expect(
        page.getByRole("tab", { name: file, selected: true }),
      ).toBeVisible();
    });

  test("an OpenNeuro dataset from a v1 link", async ({ page }) => {
    await page.goto(
      "/?p=/openneuro-dataset&datasetId=ds000001&datasetVersion=1.0.0",
    );
    await expectPath(page, "/openneuro-dataset/ds000001");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Balloon Analog Risk-taking Task",
    );
  });

  test("an OpenNeuro dataset with a file open", async ({ page }) => {
    await page.goto("/openneuro-dataset/ds000001?tab=participants.tsv|");
    await expect(
      page.getByRole("tab", { name: "participants.tsv", selected: true }),
    ).toBeVisible();
  });
});

test.describe("NWB files", () => {
  test("a file found by its path in the Dandiset", async ({ page }) => {
    await page.goto(
      "/nwb?dandisetId=000673&dandisetVersion=0.250122.0110&path=sub-1/sub-1_ses-1_ecephys%2Bimage.nwb",
    );
    await expect
      .poll(() => params(page).get("url"))
      .toBe(asset("65a7e913-45c7-48db-bf19-b9f5e910110a"));
    await expect(
      page.locator('[id="file-sections-tab-widgets"]'),
    ).toHaveAttribute("aria-selected", "true");
  });

  test("v1 neurodata-item: opens the object", async ({ page }) => {
    await page.goto(`/?p=/nwb&${WM}&tab=neurodata-item:/units|Units`);
    await expectPath(page, "/nwb");
    expect(params(page).get("dandisetId")).toBe("000673");
    await expectObjectTab(page, "/units", "clusterID_orig");
  });

  test("v1 view:PSTH| opens the PSTH", async ({ page }) => {
    await page.goto(`/?p=/nwb&${PSTH_FILE}&tab=view:PSTH|/intervals/trials`);
    await expectObjectTab(
      page,
      "view:PSTH|/intervals/trials",
      "aligned to start_time",
    );
  });

  test("v1 view:X/Y| opens the X/Y view", async ({ page }) => {
    await page.goto(
      `/?p=/nwb&${EYE_FILE}&tab=view:X/Y|/acquisition/EyeTracking/pupil_tracking`,
    );
    await expectObjectTab(
      page,
      "view:SpatialSeriesXY|/acquisition/EyeTracking/pupil_tracking",
      "X (meters)",
    );
  });

  test("v1 neurodata-items: opens the combined view", async ({ page }) => {
    await page.goto(
      `/?p=/nwb&${WM}&tab=neurodata-items:neurodata-item:/units|Units@view:RasterPlot|/units`,
    );
    await expectObjectTab(
      page,
      '["/units","Raster|/units"]',
      "2 objects: /units, /units",
    );
  });

  test("v1 embedded=1 keeps the app bar hidden", async ({ page }) => {
    await page.goto(
      `/?p=/nwb&${WM}&tab=neurodata-item:/units|Units&embedded=1`,
    );
    await expectObjectTab(page, "/units", "clusterID_orig");
    expect(params(page).get("embedded")).toBe("1");
    await expect(page.getByRole("link", { name: "Guide" })).toHaveCount(0);
  });

  test("view: with the view's settings in the hash", async ({ page }) => {
    await page.goto(
      `/nwb?${PSTH_FILE}&tab=view:PSTH|/intervals/trials#units=0,1`,
    );
    await expectObjectTab(
      page,
      "view:PSTH|/intervals/trials",
      "2 of 590 selected",
    );
  });

  test("a renamed plugin's old name opens its view", async ({ page }) => {
    await page.goto(`/nwb?${WM}&tab=view:TimeAlignedSeries|/intervals/trials`);
    await expectObjectTab(
      page,
      "view:TimeAlignedSeries|/intervals/trials",
      "Channel 0",
    );
    await expect.poll(() => new URL(page.url()).hash).toContain("ta_series=");
  });

  test("an object path and a JSON list of items", async ({ page }) => {
    await page.goto(`/nwb?${WM}&tab=/units`);
    await expectObjectTab(page, "/units", "clusterID_orig");
    await page.goto(`/nwb?${WM}&tab=["/units","Raster|/units"]`);
    await expectObjectTab(
      page,
      '["/units","Raster|/units"]',
      "2 objects: /units, /units",
    );
  });

  test("a section tab", async ({ page }) => {
    await page.goto(`/nwb?${WM}&tab=hdf5`);
    await expect(page.locator('[id="file-sections-tab-hdf5"]')).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

test.describe("archive pages and fallbacks", () => {
  for (const [link, archive] of [
    ["/dandi", "DANDI"],
    ["/?p=/dandi", "DANDI"],
    ["/ember", "EMBER"],
    ["/openneuro", "OpenNeuro"],
  ])
    test(`${link} opens the ${archive} catalog`, async ({ page }) => {
      await page.goto(link);
      await expectPath(page, link.startsWith("/?") ? "/dandi" : link);
      await expect(
        page.getByRole("checkbox", { name: new RegExp(`^${archive}`) }),
      ).toBeChecked();
      for (const other of ["DANDI", "EMBER", "OpenNeuro"].filter(
        (a) => a !== archive,
      ))
        await expect(
          page.getByRole("checkbox", { name: new RegExp(`^${other}`) }),
        ).not.toBeChecked();
      await expect(
        page.getByRole("searchbox").or(page.getByRole("textbox")).first(),
      ).toBeVisible();
    });

  for (const link of ["/", "/no-such-page?x=1", "/?p=/chat&chatId=abc"])
    test(`${link} opens Home`, async ({ page }) => {
      await page.goto(link);
      await expectPath(page, "/");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "Neurosift",
      );
    });
});
