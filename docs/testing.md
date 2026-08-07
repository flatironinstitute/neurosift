# Testing

| Suite                | Where                | Runner     | Checks                                |
| -------------------- | -------------------- | ---------- | ------------------------------------- |
| Unit tests           | `tests/unit/`        | Vitest     | Individual modules, in isolation      |
| Storybook stories    | `stories/`           | Chromatic  | Individual components, visually       |
| Page snapshots       | `tests/chromatic/`   | Chromatic  | Whole pages of the real, built app    |
| Integration tests    | `tests/integration/` | Playwright | App behavior, end to end              |

```bash
npm test                  # unit tests
npm run test:integration  # functional browser tests
npm run test:chromatic    # visual page archives
npm run storybook         # component workbench
```

## Unit tests

```bash
npm test               # single run
npm run test:watch     # watch mode
npm run test:coverage  # v8 coverage into coverage/
```

Vitest is configured in `vitest.config.ts`, which merges `vite.config.ts` so
the `@components` / `@shared` / ... path aliases work in tests. It only collects
`tests/unit/**/*.test.{ts,tsx}` — `tests/integration/` and `tests/chromatic/`
are Playwright suites and must stay out of Vitest's `include`.

Tests run in the `jsdom` environment, so modules that touch `localStorage`,
`document`, or other browser globals can be tested directly — see
`tests/unit/sendLog.test.ts`, which drives the localStorage-backed rate limiting
in `src/util/sendLog.ts`. Pure modules need nothing special; see
`tests/unit/formatBytes.test.ts` and `tests/unit/tabsReducer.test.ts`.

Mocks and global stubs are reset between tests (`restoreMocks`,
`unstubGlobals`), so individual tests do not need to clean up after themselves.

## Visual testing with Chromatic

The Storybook and page-snapshot suites are both published to
[Chromatic](https://www.chromatic.com/), which renders them and diffs the result
against accepted baselines.

## Storybook

```bash
npm run storybook        # dev server on http://localhost:6006
npm run build-storybook  # static build into storybook-static/
```

Stories live in `stories/` and use
[CSF3](https://storybook.js.org/docs/api/csf). `@storybook/react-vite` reuses the
project's `vite.config.ts`, so the `@components` / `@shared` / ... path aliases
work in stories exactly as they do in `src/`.

`.storybook/preview.tsx` wraps every story in the app's `ThemeProvider` (see
`src/theme.ts`) so components pick up the same MUI palette they get in the
running app.

To add a story, create `stories/<Component>.stories.tsx`:

```tsx
import MyComponent from "@components/MyComponent";
import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Components/MyComponent",
  component: MyComponent,
} satisfies Meta<typeof MyComponent>;

export default meta;

export const Default: StoryObj<typeof meta> = { args: { ... } };
```

Components that lay themselves out with `position: absolute` and take explicit
`width`/`height` props (`TabBar`, `ScrollY`, the page components) should be
wrapped in the `Frame` helper from `stories/utils.tsx` so the snapshot does not
depend on the size of the Storybook canvas.

## Playwright

```bash
npm run test:integration  # functional tests   (tests/integration/)
npm run test:chromatic    # visual archives    (tests/chromatic/)
```

Both configs share `playwright.shared.ts`, which runs `npm run build` and serves
the result with `vite preview` on port 4173 — so tests exercise the production
bundle, not the dev server.

Browsers are installed with `npx playwright install chromium`. In sandboxes that
pin a Chromium outside of Playwright's own download directory, set
`PLAYWRIGHT_CHROMIUM_PATH` to that binary and the shared config will use it:

```bash
PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:integration
```

The tests in `tests/chromatic/` do not assert on pixels themselves. Each one
drives the app to a state and then lets `@chromatic-com/playwright` archive the
page into `test-results/chromatic-archives/`; Chromatic renders those archives
and diffs them against the accepted baselines.

### Keeping snapshots deterministic

Anything that changes between runs will diff on every build. Mark such elements
with `data-chromatic="ignore"` in the component — for example the build-time
footer on the home page (`src/pages/HomePage/HomePage.tsx`). Network calls that
are not part of what is being captured should be stubbed; `stubTelemetry()` in
`tests/helpers/network.ts` does that for the page-load logging worker.

## CI

Four workflows cover this:

- `.github/workflows/test.yml` — runs the Vitest unit tests.
- `.github/workflows/chromatic-storybook.yml` — builds Storybook and uploads it
  to Chromatic on every push.
- `.github/workflows/chromatic-playwright.yml` — runs `npm run test:chromatic`
  and uploads the resulting page archives to Chromatic on every push.
- `.github/workflows/playwright.yml` — runs the functional integration tests.

The two Chromatic workflows each need a repository secret holding the project
token of a **separate** Chromatic project (Chromatic does not accept Storybook
builds and Playwright archives under one project):

| Secret                                | Chromatic project                        |
| ------------------------------------- | ---------------------------------------- |
| `CHROMATIC_STORYBOOK_PROJECT_TOKEN`   | the one created for the Storybook build  |
| `CHROMATIC_PLAYWRIGHT_PROJECT_TOKEN`  | the one created for the Playwright build |

Until those secrets are set the two Chromatic jobs will fail; the unit-test and
Playwright integration workflows need no secrets and work as-is.
