# Testing

| Suite                | Where                | Runner     | Checks                                |
| -------------------- | -------------------- | ---------- | ------------------------------------- |
| Unit tests           | `tests/unit/`        | Vitest     | Individual modules, in isolation      |
| Storybook stories    | `stories/`           | Chromatic  | Individual components, visually       |
| Page snapshots       | `tests/chromatic/`   | Chromatic  | Whole pages of the real, built app    |
| Integration tests    | `tests/integration/` | Playwright | App behavior, end to end              |

All tool configuration lives in `configs/`:

```
configs/
  aliases.ts                       shared path aliases (vite + vitest + storybook)
  eslint.config.js
  playwright.config.ts             integration suite
  playwright.chromatic.config.ts   visual suite
  playwright.shared.ts             settings common to both
  storybook/{main.ts,preview.tsx}
  tsconfig.app.json                src/
  tsconfig.node.json               configs/*.ts
  tsconfig.test.json               stories/, tests/, configs/storybook/
  vite.config.ts
  vitest.config.ts
```

The root `tsconfig.json` is a thin shim that references the three projects under
`configs/`, so editors and a bare `tsc -b` still work from the repo root. Every
npm script passes the relevant `--config` / `--config-dir` explicitly.

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

Vitest is configured in `configs/vitest.config.ts`, which merges
`configs/vite.config.ts` so the `@components` / `@shared` / ... path aliases work in tests. It only collects
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
[CSF3](https://storybook.js.org/docs/api/csf). Because the Vite config lives in
`configs/` rather than the repo root, Storybook cannot auto-discover it; the
`@components` / `@shared` / ... aliases are injected instead from
`configs/aliases.ts`, the single source shared by Vite, Vitest, and Storybook.

`configs/storybook/preview.tsx` wraps every story in the app's `ThemeProvider`
(see `src/theme.ts`) so components pick up the same MUI palette they get in the
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

Both configs share `configs/playwright.shared.ts`, which runs `npm run build` and serves
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
footer on the home page (`src/pages/HomePage/HomePage.tsx`).

Remote data must be stubbed, not fetched. `tests/helpers/` holds the stubs:

- `network.ts` — `stubTelemetry()` neutralizes the fire-and-forget page-load
  logging worker.
- `dandi.ts` — `mockDandisetPage()` serves a wholly synthetic dandiset across
  the three DANDI API endpoints the dandiset page uses. Identifier, title,
  version and description are all invented, not a mirror of
  the live archive: querying the real API would rebaseline the snapshot every
  time the dandiset is edited, and fail whenever the API is unreachable.

Two further traps are worth knowing about, because a test can pass while
capturing nothing useful:

- **Scroll position is not preserved.** Chromatic re-renders the archived DOM
  from the top, so state that is only reachable by scrolling (anything below the
  fold inside a `ScrollY` container) will not appear in the snapshot, and the
  archive comes out identical to the unscrolled page.
- **Passing assertions are not proof.** After adding a snapshot, look at the
  captured page before trusting it.

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
