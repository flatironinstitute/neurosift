import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

// WCAG 2.2 AA on every docs page; the pages are found from the side menu, so new pages are covered.
const pages: string[] = [];

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto("./");
  const hrefs = await page
    .locator(".side-menu a")
    .evaluateAll((links) => links.map((a) => a.getAttribute("href") ?? ""));
  pages.push(...new Set(hrefs));
  await page.close();
});

// Names what sticks out past the window, so a failure says where to look.
// WebKit, like Safari's default, tabs only between form fields; Alt+Tab reaches every control.
const tab = (browserName: string) =>
  browserName === "webkit" ? "Alt+Tab" : "Tab";

const overflow = (page: Page) =>
  page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth <= width) return [];
    return [...document.querySelectorAll("body *")]
      .filter(
        (el) =>
          !el.closest(".doc-table, pre") &&
          el.getBoundingClientRect().right > width + 1,
      )
      .map(
        (el) =>
          `${el.tagName.toLowerCase()}.${el.className} ${Math.round(el.getBoundingClientRect().right - width)}px`,
      );
  });

const clipped = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("main *, nav *, header *")]
      .filter((el) => {
        if (el.closest(".doc-table, .ns-visually-hidden, .visually-hidden"))
          return false;
        const style = getComputedStyle(el);
        // An ellipsis that keeps its full text in title, such as an object's description, isn't lost.
        if (
          style.textOverflow === "ellipsis" &&
          el.getAttribute("title") === el.textContent
        )
          return false;
        const hides = ["hidden", "clip"].some(
          (v) => style.overflowX === v || style.overflowY === v,
        );
        return (
          hides &&
          (el.scrollWidth > el.clientWidth + 1 ||
            el.scrollHeight > el.clientHeight + 1)
        );
      })
      .map((el) => el.className),
  );

test("every internal link and every asset a page loads responds", async ({
  page,
  request,
}) => {
  const failed: string[] = [];
  page.on("response", (response) => {
    if (response.status() >= 400)
      failed.push(`${response.status()} ${response.url()}`);
  });
  const links = new Set<string>();
  test.setTimeout(pages.length * 10_000);
  for (const path of pages) {
    await page.goto(path);
    const hrefs = await page
      .locator("a[href^='/']")
      .evaluateAll((as) =>
        as.map((a) => (a as HTMLAnchorElement).href.split("#")[0]),
      );
    hrefs.forEach((href) => links.add(href));
  }
  for (const href of links) {
    const response = await request.get(href);
    if (!response.ok()) failed.push(`${response.status()} ${href}`);
  }
  expect(failed).toEqual([]);
});

// A fresh tab per page keeps memory flat; one tab for every page crashed Firefox in CI.
test("every page passes axe at WCAG 2.2 AA", async ({ context }) => {
  test.setTimeout(pages.length * 10_000);
  for (const path of pages) {
    const page = await context.newPage();
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    await page.close();
    expect(violations.map((v) => `${path} ${v.id}`)).toEqual([]);
  }
});

test("every page has one h1 first, no skipped heading levels, and labelled landmarks", async ({
  page,
}) => {
  test.setTimeout(pages.length * 10_000);
  for (const path of pages) {
    await page.goto(path);
    const levels = await page
      .locator("h1, h2, h3, h4, h5, h6")
      .evaluateAll((hs) => hs.map((h) => Number(h.tagName[1])));
    expect(levels[0], path).toBe(1);
    expect(
      levels.filter((l) => l === 1),
      path,
    ).toHaveLength(1);
    expect(
      levels.some((l, i) => i > 0 && l > levels[i - 1] + 1),
      path,
    ).toBe(false);
    await expect(page.locator("main"), path).toHaveCount(1);
    // The side menu, plus any navigation a component page demonstrates; each is labelled.
    await expect(page.locator(".side-menu[aria-label]"), path).toHaveCount(1);
    await expect(page.locator("nav:not([aria-label])"), path).toHaveCount(0);
  }
});

test("the keyboard reaches the skip link first and every stop shows a 2px focus ring", async ({
  page,
  browserName,
}) => {
  test.setTimeout(pages.length * 10_000);
  for (const path of pages) {
    await page.goto(path);
    await page.keyboard.press(tab(browserName));
    await expect(page.locator(".skip-link"), path).toBeFocused();
    for (let stop = 0; stop < 30; stop++) {
      // Fields show focus by thickening their own edge in border/focus, with no second ring inside; everything else gets a ring.
      const ring = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const name =
          el.textContent?.trim() ||
          el.getAttribute("aria-label") ||
          (el as HTMLInputElement).labels?.[0]?.textContent;
        const frame = el.matches("input, select")
          ? el.closest<HTMLElement>(".ns-field-box, .ns-search")
          : null;
        if (frame) {
          const probe = document.createElement("span");
          probe.style.color = "var(--border-focus)";
          document.body.append(probe);
          const focus = getComputedStyle(probe).color;
          probe.remove();
          const edge = getComputedStyle(frame);
          return {
            name,
            shown:
              edge.borderColor === focus &&
              edge.boxShadow !== "none" &&
              getComputedStyle(el).outlineStyle === "none",
          };
        }
        const style = getComputedStyle(el);
        return {
          name,
          shown:
            style.outlineStyle !== "none" &&
            parseFloat(style.outlineWidth) >= 2,
        };
      });
      expect(ring.shown, `${path} ${ring.name}`).toBe(true);
      await page.keyboard.press(tab(browserName));
      if (await page.evaluate(() => document.activeElement === document.body))
        break;
    }
  }
});

test("links and controls are at least 24 by 24 pixels", async ({ page }) => {
  test.setTimeout(pages.length * 10_000);
  for (const path of pages) {
    await page.goto(path);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll("a, button, [tabindex='0']")]
        .filter(
          (el) =>
            el.checkVisibility() &&
            !el.matches(".skip-link") &&
            // WCAG's inline exception: links, and link buttons (which browsers render inline-block), in running text.
            !(
              (getComputedStyle(el).display === "inline" ||
                el.matches(".ns-button--link")) &&
              el.closest("p, li, figcaption")
            ),
        )
        .map((el) => ({
          el: el.textContent?.trim(),
          box: el.getBoundingClientRect(),
        }))
        .filter(({ box }) => box.width < 24 || box.height < 24)
        .map(({ el }) => el),
    );
    expect(small, path).toEqual([]);
  }
});

test("pages reflow at 320px wide and survive text spacing overrides", async ({
  page,
}) => {
  test.setTimeout(pages.length * 10_000);
  for (const path of pages) {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(path);
    expect(await overflow(page), path).toEqual([]);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.addStyleTag({
      content:
        "* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-block-end: 2em !important; }",
    });
    expect(await clipped(page), path).toEqual([]);
  }
});

test("text at 200% of the browser's default size neither overflows nor clips", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Sets font sizes through Chromium's DevTools protocol",
  );
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Page.setFontSizes", {
    fontSizes: { standard: 32, fixed: 26 },
  });
  test.setTimeout(pages.length * 10_000);
  for (const path of pages) {
    await page.goto(path);
    expect(await overflow(page), path).toEqual([]);
    expect(await clipped(page), path).toEqual([]);
  }
});

test("buttons: a loading button is as wide as the same button not loading", async ({
  page,
}) => {
  await page.goto("components/buttons/");
  const pairs = await page.evaluate(() =>
    [...document.querySelectorAll("table")].flatMap((table) => {
      const heads = [...table.querySelectorAll("thead th")].map(
        (th) => th.textContent,
      );
      const idle = heads.indexOf("Default");
      const busy = heads.indexOf("Loading");
      if (idle < 0 || busy < 0) return [];
      return [...table.querySelectorAll("tbody tr")].map((row) => {
        const cells = row.children;
        const button = (i: number) =>
          cells[i].querySelector(".ns-button") as HTMLElement;
        const loading = button(busy);
        const spinner = loading
          .querySelector(".ns-spinner")!
          .getBoundingClientRect();
        const box = loading.getBoundingClientRect();
        return {
          row: row.querySelector("th")?.textContent,
          idle: button(idle).getBoundingClientRect().width,
          busy: box.width,
          centered:
            loading.dataset.spinner !== "center" ||
            Math.abs(
              spinner.left + spinner.width / 2 - (box.left + box.width / 2),
            ) < 1,
        };
      });
    }),
  );
  expect(pairs.length).toBeGreaterThanOrEqual(8);
  for (const { row, idle, busy, centered } of pairs) {
    expect(busy, `${row} loading width`).toBeCloseTo(idle, 2);
    expect(centered, `${row} spinner centered`).toBe(true);
  }
});

test("checkboxes: Space and a click on the label toggle; a disabled box doesn't change", async ({
  page,
}) => {
  await page.goto("components/checkboxes/");
  const ember = page.getByRole("checkbox", { name: /^EMBER/ });
  await expect(ember).not.toBeChecked();
  await ember.focus();
  await page.keyboard.press("Space");
  await expect(ember).toBeChecked();
  await page.getByText("EMBER", { exact: true }).click();
  await expect(ember).not.toBeChecked();
  const disabled = page.locator(".ns-checkbox-input:disabled").first();
  const before = await disabled.isChecked();
  await disabled.click({ force: true });
  expect(await disabled.isChecked()).toBe(before);
});

test("text inputs: an invalid field points to a visible message that says what fits", async ({
  page,
}) => {
  await page.goto("components/text-inputs/");
  const invalid = page.locator("[aria-invalid='true']");
  expect(await invalid.count()).toBeGreaterThan(0);
  for (const field of await invalid.all()) {
    const id = await field.getAttribute("aria-describedby");
    const message = page.locator(`[id="${id}"]`);
    await expect(message).toBeVisible();
    await expect(message).toContainText(/\S/);
  }
});

test("buttons: disabled ones leave the tab order, loading ones stay and say they're busy", async ({
  page,
}) => {
  await page.goto("components/buttons/");
  const disabled = page.locator("button:disabled").first();
  await expect(disabled).toBeDisabled();
  expect(await disabled.evaluate((el) => (el as HTMLElement).tabIndex)).toBe(0);
  await disabled.focus();
  await expect(disabled).not.toBeFocused();
  const loading = page.locator("button[aria-busy='true']").first();
  await loading.focus();
  await expect(loading).toBeFocused();
});

test("buttons keep a visible edge and focus ring in forced colors", async ({
  page,
  browserName,
}) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("components/buttons/");
  const edges = await page
    .locator(".ns-button:not(.ns-button--link), .ns-icon-button")
    .evaluateAll((buttons) =>
      buttons.map((b) => {
        const style = getComputedStyle(b);
        return (
          style.borderStyle === "solid" && parseFloat(style.borderWidth) >= 1
        );
      }),
    );
  expect(edges.every(Boolean)).toBe(true);
  // Link buttons read as links, so they keep an underline instead of an edge.
  const underlines = await page
    .locator(".ns-button--link:not(:disabled)")
    .evaluateAll((links) =>
      links.map((l) =>
        getComputedStyle(l).textDecorationLine.includes("underline"),
      ),
    );
  expect(underlines.length).toBeGreaterThan(0);
  expect(underlines.every(Boolean)).toBe(true);
  const button = page.locator(".ns-button--primary").first();
  await button.focus();
  await page.keyboard.press(`Shift+${tab(browserName)}`);
  await page.keyboard.press(tab(browserName));
  expect(
    await button.evaluate((b) => getComputedStyle(b).outlineStyle),
  ).not.toBe("none");
});

test("the spinner stops moving under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("components/buttons/");
  const animation = await page
    .locator(".ns-spinner-arc")
    .first()
    .evaluate((arc) => getComputedStyle(arc).animationName);
  expect(animation).toBe("none");
});

test("selects: Space opens the list, Escape closes it and keeps the value and focus", async ({
  page,
  browserName,
}) => {
  await page.goto("components/selects/");
  const select = page.getByRole("combobox", { name: "Playback speed" });
  await select.focus();
  await page.keyboard.press("Space");
  expect(await select.evaluate((s) => s.matches(":open"))).toBe(true);
  test.skip(
    browserName === "firefox",
    "Firefox's native list doesn't take synthetic keys",
  );
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Escape");
  expect(await select.evaluate((s) => s.matches(":open"))).toBe(false);
  await expect(select).toBeFocused();
  await expect(select).toHaveValue("1×");
});

test("selects: arrows and Enter pick from the styled list; typing jumps to an option", async ({
  page,
  browserName,
}) => {
  await page.goto("components/selects/");
  const select = page.getByRole("combobox", { name: "Playback speed" });
  await select.focus();
  if (browserName !== "firefox") {
    // Firefox's native list doesn't take synthetic keys; the others pick from the styled list.
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(select).toHaveValue("2×");
    expect(await select.evaluate((s) => s.matches(":open"))).toBe(false);
  }
  await page.keyboard.type("8");
  await expect(select).toHaveValue("8×");
});

test("menus: Enter opens on the first item, arrows skip disabled items, Escape returns focus", async ({
  page,
}) => {
  await page.goto("components/selects/");
  const trigger = page.getByRole("button", { name: "Share" }).first();
  await trigger.scrollIntoViewIfNeeded();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await page.waitForFunction(
    () => !document.querySelector("astro-island[ssr]"),
  );
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("menuitem", { name: "Copy link" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("menuitem", { name: "View on DANDI" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("menus: open under their button, at least as wide, and picking runs the item", async ({
  page,
}) => {
  await page.goto("components/selects/");
  const trigger = page.getByRole("button", { name: "Share" }).first();
  await trigger.scrollIntoViewIfNeeded();
  await page.waitForFunction(
    () => !document.querySelector("astro-island[ssr]"),
  );
  await trigger.click();
  const menu = page.getByRole("menu").first();
  const [button, list] = [
    await trigger.boundingBox(),
    await menu.boundingBox(),
  ];
  expect(list!.y).toBeGreaterThanOrEqual(button!.y + button!.height);
  expect(Math.round(list!.x)).toBe(Math.round(button!.x));
  expect(list!.width).toBeGreaterThanOrEqual(button!.width);
  await page.getByRole("menuitem", { name: "Copy link" }).click();
  await expect(menu).toBeHidden();
  await expect(page.getByRole("status").first()).toHaveText("Ran “Copy link”");
});

const tooltipOf = (page: Page, name: string) =>
  page
    .getByRole("button", { name })
    .locator("xpath=following-sibling::*[contains(@class, 'ns-tooltip')]");
const isOpen = (tooltip: Locator) =>
  tooltip.evaluate((el) => el.matches(":popover-open"));

test("tooltips: 500ms after hover, at once on keyboard focus, gone on Escape", async ({
  page,
  browserName,
}) => {
  await page.goto("components/tooltips/");
  await page.waitForFunction(
    () => !document.querySelector(".tooltip-demo astro-island[ssr]"),
  );
  const settings = page.getByRole("button", { name: "Settings" });
  const tooltip = tooltipOf(page, "Settings");
  await settings.hover();
  await page.waitForTimeout(250);
  expect(await isOpen(tooltip)).toBe(false);
  await expect.poll(() => isOpen(tooltip)).toBe(true);
  await page.mouse.move(0, 0);
  await expect.poll(() => isOpen(tooltip)).toBe(false);
  await page.getByRole("button", { name: "Earlier" }).focus();
  await page.keyboard.press(tab(browserName));
  await expect(settings).toBeFocused();
  expect(await isOpen(tooltip)).toBe(true);
  await page.keyboard.press("Escape");
  expect(await isOpen(tooltip)).toBe(false);
});

test("tooltips: the pointer can move onto a tooltip without it closing (WCAG 1.4.13)", async ({
  page,
}) => {
  await page.goto("components/tooltips/");
  await page.waitForFunction(
    () => !document.querySelector(".tooltip-demo astro-island[ssr]"),
  );
  await page.getByRole("button", { name: "Settings" }).hover();
  const tooltip = tooltipOf(page, "Settings");
  await expect.poll(() => isOpen(tooltip)).toBe(true);
  const box = (await tooltip.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
    steps: 5,
  });
  await page.waitForTimeout(300);
  expect(await isOpen(tooltip)).toBe(true);
});

test("tooltips: never appear on touch", async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true });
  const page = await context.newPage();
  await page.goto("components/tooltips/");
  await page.waitForFunction(
    () => !document.querySelector(".tooltip-demo astro-island[ssr]"),
  );
  await page.getByRole("button", { name: "Settings" }).tap();
  await page.waitForTimeout(700);
  expect(await isOpen(tooltipOf(page, "Settings"))).toBe(false);
  await context.close();
});

test("toggletips: Enter opens, Escape closes and returns focus to the Info button", async ({
  page,
}) => {
  await page.goto("components/tooltips/");
  const info = page.getByRole("button", { name: "About shared y-scale" });
  await info.scrollIntoViewIfNeeded();
  await page.waitForFunction(
    () => !document.querySelector(".toggletip-demo astro-island[ssr]"),
  );
  await info.focus();
  await page.keyboard.press("Enter");
  await expect(info).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".ns-toggletip-panel")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(info).toHaveAttribute("aria-expanded", "false");
  await expect(info).toBeFocused();
});

test("alerts: errors are announced at once, other messages politely, and none takes focus", async ({
  page,
}) => {
  await page.goto("components/alerts/");
  const alerts = page.locator(".alert-demo");
  await expect(alerts.getByRole("alert")).toHaveCount(1);
  await expect(alerts.getByRole("status")).toHaveCount(4);
  const inline = page.locator(".inline-message-demo");
  await expect(inline.getByRole("alert")).toHaveCount(1);
  await expect(inline.getByRole("status")).toHaveCount(2);
  expect(
    await page.evaluate(() => document.activeElement === document.body),
  ).toBe(true);
});

const toastPage = async (page: Page) => {
  await page.clock.install();
  await page.goto("components/alerts/");
  const closeTab = page.getByRole("button", { name: "Close tab" });
  await closeTab.scrollIntoViewIfNeeded();
  await page.waitForFunction(
    () => !document.querySelector("astro-island[ssr]"),
  );
  // Only the test moves time, so a slow machine can't run out a toast's 4 seconds.
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 100);
  const region = page.locator(".ns-toast-region");
  return {
    button: (name: string) => page.getByRole("button", { name, exact: true }),
    polite: region.getByRole("status"),
    urgent: region.getByRole("alert"),
  };
};

test("toasts: read politely and gone after 4 seconds; errors read at once and stay; focus never moves", async ({
  page,
}) => {
  const { button, polite, urgent } = await toastPage(page);
  await button("Copy link").focus();
  await page.keyboard.press("Enter");
  await expect(polite).toContainText("Link copied");
  await expect(button("Copy link")).toBeFocused();
  await page.clock.runFor(4100);
  await expect(polite).toHaveText("");
  await button("Fail to copy").focus();
  await page.keyboard.press("Enter");
  await expect(urgent).toContainText("Couldn’t copy the link.");
  await expect(polite).toHaveText("");
  await page.clock.runFor(60000);
  await expect(urgent).toContainText("Couldn’t copy the link.");
  await expect(button("Fail to copy")).toBeFocused();
});

test("toasts: wait while hovered or focused, and return focus when they close", async ({
  page,
}) => {
  const { button, polite } = await toastPage(page);
  await button("Close tab").focus();
  await page.keyboard.press("Enter");
  await expect(polite).toContainText("Tab closed");
  await polite.hover();
  await page.clock.runFor(10000);
  await expect(polite).toContainText("Tab closed");
  await page.mouse.move(0, 0);
  await page.clock.runFor(4100);
  await expect(polite).toHaveText("");

  await button("Close tab").focus();
  await page.keyboard.press("Enter");
  await polite.getByRole("button", { name: "Undo" }).focus();
  await page.clock.runFor(10000);
  await expect(polite).toContainText("Tab closed");
  await page.keyboard.press("Enter");
  await expect(polite).toHaveText("");
  await expect(button("Close tab")).toBeFocused();
});

test("time controls: buttons and the plot's keys move one shared window; the overview steps from the keyboard", async ({
  page,
}) => {
  await page.goto("components/time-controls/");
  const length = page.getByRole("textbox", { name: "Window length" });
  await length.scrollIntoViewIfNeeded();
  await expect(
    length.locator("xpath=ancestor::astro-island[1]"),
  ).not.toHaveAttribute("ssr");
  await page.getByRole("button", { name: "Zoom out" }).click();
  await expect(length).toHaveValue("5.25");
  const plot = page.getByRole("application", { name: "LFP plot, stand-in" });
  await plot.focus();
  await page.keyboard.press("=");
  await expect(length).toHaveValue("3.75");
  await page.keyboard.press("Home");
  await expect(page.getByRole("textbox", { name: "Window start" })).toHaveValue(
    "0.00",
  );
  await expect(page.getByRole("button", { name: "Earlier" })).toBeDisabled();
  const overview = page.getByRole("slider", { name: "Time overview" });
  await overview.focus();
  await page.keyboard.press("Shift+ArrowRight");
  await expect(overview).toHaveAttribute(
    "aria-valuetext",
    "3.75 s from 3.75 s",
  );
});

test("sliders: arrows, Page Up, Home and End move the value; the field takes an exact one", async ({
  page,
}) => {
  await page.goto("components/sliders/");
  const slider = page.getByRole("slider", { name: "Plane" });
  await slider.scrollIntoViewIfNeeded();
  await expect(
    slider.locator("xpath=ancestor::astro-island[1]"),
  ).not.toHaveAttribute("ssr");
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuetext", "6");
  await page.keyboard.press("Home");
  await expect(slider).toHaveAttribute("aria-valuetext", "0");
  await page.keyboard.press("PageUp");
  await expect(slider).toHaveAttribute("aria-valuetext", "10");
  await page.keyboard.press("End");
  await expect(slider).toHaveAttribute("aria-valuetext", "11");
  const field = page.getByRole("textbox", { name: "Plane value" });
  await field.fill("3");
  await field.press("Enter");
  await expect(slider).toHaveAttribute("aria-valuetext", "3");

  const low = page.getByRole("slider", { name: "Display range, low" });
  await low.scrollIntoViewIfNeeded();
  await expect(
    low.locator("xpath=ancestor::astro-island[1]"),
  ).not.toHaveAttribute("ssr");
  await low.focus();
  await page.keyboard.press("End");
  await expect(low).toHaveAttribute("aria-valuetext", "3,400");
});

test("tables and trees: a header sorts and says so; the tree opens and climbs with the arrow keys", async ({
  page,
}) => {
  await page.goto("components/tables/");
  const table = page.getByRole("table", { name: "Units", exact: true });
  await table.scrollIntoViewIfNeeded();
  await expect(
    table.locator("xpath=ancestor::astro-island[1]"),
  ).not.toHaveAttribute("ssr");
  const spikes = table.getByRole("button", { name: "Spikes" });
  await spikes.focus();
  await page.keyboard.press("Enter");
  await expect(
    table.getByRole("columnheader", { name: "Spikes" }),
  ).toHaveAttribute("aria-sort", "ascending");
  await expect(table.locator("tbody tr").first()).toContainText("382");

  const tree = page.getByRole("tree", { name: "Files in this Dandiset" });
  await tree.scrollIntoViewIfNeeded();
  await expect(
    tree.locator("xpath=ancestor::astro-island[1]"),
  ).not.toHaveAttribute("ssr");
  const second = tree.getByRole("treeitem", { name: /^sub-491604983(?!_)/ });
  await tree.getByRole("treeitem").first().focus();
  await page.keyboard.press("ArrowLeft");
  await expect(tree.getByRole("treeitem")).toHaveCount(3);
  await page.keyboard.press("ArrowDown");
  await expect(second).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(second).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("ArrowRight");
  await expect(
    tree.getByRole("treeitem", { name: /^sub-491604983_ses-01/ }),
  ).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(second).toBeFocused();
});

test("dialogs: focus starts on the title, Tab stays inside, Escape closes and focus returns to the opener", async ({
  page,
  browserName,
}) => {
  await page.goto("components/modals/");
  const opener = page.getByRole("button", { name: "Remove API key" });
  await opener.scrollIntoViewIfNeeded();
  await expect(
    opener.locator("xpath=ancestor::astro-island[1]"),
  ).not.toHaveAttribute("ssr");
  await opener.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", {
    name: "Remove the DANDI API key?",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading")).toBeFocused();
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press(tab(browserName));
    expect(
      await dialog.evaluate((d) => d.contains(document.activeElement)),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();

  const info = page.getByRole("button", { name: "Column info" });
  await info.scrollIntoViewIfNeeded();
  await expect(
    info.locator("xpath=ancestor::astro-island[1]"),
  ).not.toHaveAttribute("ssr");
  await info.focus();
  await page.keyboard.press("Enter");
  const drawer = page.getByRole("dialog", { name: "Column info" });
  await expect(drawer.getByRole("heading")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(info).toBeFocused();
});

test("breadcrumbs: a folded trail shows every level again, and focus moves to the first one revealed", async ({
  page,
}) => {
  await page.goto("components/navigation/");
  const more = page
    .locator(".breadcrumbs-narrow-demo")
    .getByRole("button", { name: "Show all levels" });
  await more.scrollIntoViewIfNeeded();
  await expect(
    more.locator("xpath=ancestor::astro-island[1]"),
  ).not.toHaveAttribute("ssr");
  const nav = page.locator(".breadcrumbs-narrow-demo nav");
  const middle = nav.getByRole("link", { name: "sub-1", exact: true });
  await expect(middle).toBeHidden();
  await more.focus();
  await page.keyboard.press("Enter");
  await expect(middle).toBeVisible();
  await expect(
    nav.getByRole("link", { name: "000673 · Control of working memory" }),
  ).toBeFocused();
  await expect(nav.locator("[aria-current='page']")).toHaveText(
    "sub-1_ses-1_ecephys+image.nwb",
  );
});

// Waits for the island that holds this element; islands below the fold load when scrolled to.
const hydrated = async (locator: Locator) => {
  await locator.scrollIntoViewIfNeeded();
  await expect(
    locator.locator("xpath=ancestor::astro-island[1]"),
  ).not.toHaveAttribute("ssr");
};

test("tabs: arrows move and open tabs, Home and End reach the ends, and Delete closes an object tab", async ({
  page,
}) => {
  await page.goto("components/tabs/");
  const sections = page.getByRole("tablist", { name: "File views" });
  await hydrated(sections);
  await sections.getByRole("tab", { name: "Widgets" }).focus();
  await page.keyboard.press("ArrowRight");
  const alignment = sections.getByRole("tab", { name: "Timeseries alignment" });
  await expect(alignment).toBeFocused();
  await expect(alignment).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("tabpanel", { name: "Timeseries alignment" }),
  ).toBeVisible();
  await page.keyboard.press("End");
  await expect(sections.getByRole("tab", { name: "HDF5" })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(sections.getByRole("tab", { name: "Widgets" })).toBeFocused();

  const objects = page.getByRole("tablist", { name: "Open objects" });
  await hydrated(objects);
  await objects.getByRole("tab", { name: "LFPs" }).focus();
  await page.keyboard.press("Delete");
  await expect(objects.getByRole("tab", { name: "LFPs" })).toHaveCount(0);
  await expect(objects.getByRole("tab", { name: "units" })).toBeFocused();
  await objects.getByRole("tab", { name: "Main" }).focus();
  await page.keyboard.press("Delete");
  await expect(objects.getByRole("tab", { name: "Main" })).toHaveCount(1);
});

test("segmented controls: one stop in the tab order, arrows move the selection and skip disabled options", async ({
  page,
}) => {
  await page.goto("components/tabs/");
  const group = page.getByRole("radiogroup", { name: "Search by" });
  await hydrated(group);
  await group.getByRole("radio", { name: "Basic" }).focus();
  await page.keyboard.press("ArrowRight");
  const types = group.getByRole("radio", { name: "Neurodata types" });
  await expect(types).toBeFocused();
  await expect(types).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("ArrowRight");
  await expect(group.getByRole("radio", { name: "Basic" })).toBeFocused();
  await page.keyboard.press("End");
  await expect(types).toBeFocused();
  await expect(group.locator("[tabindex='0']")).toHaveCount(1);
});

test("accordions: Enter and Space open and close a section; a disclosure says whether it's open", async ({
  page,
}) => {
  await page.goto("components/accordions/");
  const header = page.locator("summary", { hasText: "Controls" });
  await header.scrollIntoViewIfNeeded();
  await expect(
    header.locator("xpath=ancestor::astro-island[1]"),
  ).not.toHaveAttribute("ssr");
  const details = header.locator("xpath=..");
  await expect(details).not.toHaveAttribute("open");
  await header.focus();
  await page.keyboard.press("Enter");
  await expect(details).toHaveAttribute("open");
  await expect(page.getByLabel("Window start")).toBeVisible();
  await header.focus();
  await page.keyboard.press(" ");
  await expect(details).not.toHaveAttribute("open");

  const more = page.getByRole("button", { name: "Show full description" });
  await more.scrollIntoViewIfNeeded();
  await expect(
    more.locator("xpath=ancestor::astro-island[1]"),
  ).not.toHaveAttribute("ssr");
  await more.focus();
  await page.keyboard.press("Enter");
  const less = page.getByRole("button", { name: "Show less" });
  await expect(less).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByText("Neural activity from two neuron populations"),
  ).toBeVisible();
  await expect(less).toBeFocused();
});

test("code blocks: Copy copies the code without the $ prompt or line numbers, and says Copied", async ({
  page,
  browserName,
  context,
}) => {
  test.skip(
    browserName !== "chromium",
    "Only Chromium lets tests grant clipboard access.",
  );
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("components/code/");
  const copyShell = page.getByRole("button", { name: "Copy Shell code" });
  await copyShell.scrollIntoViewIfNeeded();
  await expect(
    copyShell.locator("xpath=ancestor::astro-island[1]"),
  ).not.toHaveAttribute("ssr");
  await copyShell.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "pip install --upgrade lindi",
  );
  const copyPython = page.getByRole("button", { name: "Copy Python code" });
  await expect(
    copyPython.locator("xpath=ancestor::astro-island[1]"),
  ).not.toHaveAttribute("ssr");
  await copyPython.click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied.startsWith("import lindi\n\nurl = ")).toBe(true);
  expect(copied).not.toMatch(/^\d/m);
});

test("API key fields: the show button toggles by keyboard and keeps focus", async ({
  page,
}) => {
  await page.goto("components/text-inputs/");
  const field = page.getByLabel("EMBER API key");
  await hydrated(field);
  await field.fill("abc123");
  const show = page.getByRole("button", { name: "Show API key" }).first();
  await show.focus();
  await page.keyboard.press("Enter");
  await expect(field).toHaveAttribute("type", "text");
  const hide = page.getByRole("button", { name: "Hide API key" });
  await expect(hide).toBeFocused();
  await page.keyboard.press(" ");
  await expect(field).toHaveAttribute("type", "password");
  await expect(field).toHaveValue("abc123");
});

test("message box: Shift+Enter adds a line, Enter sends, and the field grows with its text", async ({
  page,
}) => {
  await page.goto("components/text-inputs/");
  const field = page.getByRole("textbox", { name: "Message", exact: true });
  await hydrated(field);
  const oneRow = (await field.boundingBox())?.height ?? 0;
  await field.pressSequentially("First line");
  await page.keyboard.press("Shift+Enter");
  await field.pressSequentially("Second line");
  await expect(field).toHaveValue("First line\nSecond line");
  expect((await field.boundingBox())?.height).toBeGreaterThan(oneRow);
  await page.keyboard.press("Enter");
  await expect(field).toHaveValue("");
  await expect(
    page.getByRole("list", { name: "Sent messages" }).getByRole("listitem"),
  ).toHaveText("First line\nSecond line");
  await expect(field).toBeFocused();
});

test("object tree: checking two objects shows the selection bar, and Clear empties it", async ({
  page,
}) => {
  await page.goto("components/tables/");
  const lfps = page.getByRole("checkbox", {
    name: "Add LFPs to the combined view",
  });
  await hydrated(lfps);
  await lfps.check();
  await page
    .getByRole("checkbox", { name: "Add units to the combined view" })
    .check();
  const bar = page.getByRole("region", { name: "Combined view selection" });
  await expect(bar).toContainText("LFPs and units");
  await bar.getByRole("button", { name: "Clear" }).click();
  await expect(bar).toHaveCount(0);
});

test("data tooltip: arrow keys on a focused plot move the cursor and announce the values", async ({
  page,
}) => {
  await page.goto("components/tooltips/");
  const plot = page.getByRole("group", { name: /LFPs, channels 0 to 3/ });
  await hydrated(plot);
  await plot.focus();
  await page.keyboard.press("ArrowRight");
  const readout = plot.getByRole("status");
  await expect(readout).toContainText(" s");
  await expect(readout).toContainText("µV");
});

test("multi-select: typing filters anywhere in a name, Enter adds a tag, Backspace removes the last", async ({
  page,
}) => {
  await page.goto("components/selects/");
  const input = page.getByRole("combobox", { name: "Neurodata types" });
  await hydrated(input);
  await input.fill("plane");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Remove PlaneSegmentation" }),
  ).toBeVisible();
  await expect(input).toHaveValue("");
  await page.keyboard.press("Backspace");
  await expect(
    page.getByRole("button", { name: "Remove PlaneSegmentation" }),
  ).toHaveCount(0);
});
