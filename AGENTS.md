# Agent instructions

## Run every CI check before pushing

The `Pull Request Checks` workflow (`.github/workflows/pr-checks.yml`) runs on the
whole repository, not only on the files a change touches. Run all of its checks
locally before every push, even for a TypeScript-only change:

```bash
pip install black && black --check .   # Python formatting (black . to fix)
npm run format:check                   # prettier, all of src/ (npm run format to fix)
npm run lint                           # eslint
npx tsc -b --noEmit                    # type checking
npm test                               # unit tests (vitest)
npm run build && npm run check:bundle  # per-page JavaScript budget
```

Notes:

- CI installs the latest `black`, unpinned. A file that passed before can fail
  after a black release, and a Python file another PR merged unformatted fails
  every later PR. If `black --check .` flags files your change did not touch, run
  `black` on them and include the result in your PR rather than leaving CI red.
- Run `npm run format:check` (the whole `src/` glob), not prettier on just the
  files you edited.
- Run `npm ci` first if `node_modules` is missing, otherwise the checks above fail
  for unrelated reasons.
- `codespell` also runs in CI (`.github/workflows/codespell.yml`, configured by
  `.codespellrc`).

## Design system

The design system lives in `design-system/`: design tokens in `tokens/`, icon sources in `icons/` and its documentation site in `docs/` (Astro, with its own install: `npm run docs:install`, then `npm run docs:dev`). Its components live in `src/ui/`, imported as `@ui`, and the docs render those same components.

- **Generated files, do not edit by hand:** `src/css/tokens.css` and `design-system/docs/src/styles/specimens.css` (edit `design-system/tokens/*.tokens.json`, the W3C design tokens exported from Figma, then run `npm run tokens`), and `src/ui/Icon/icons.ts` (add a Carbon SVG to `design-system/icons/carbon/`, then run `npm run icons`). Tests fail if a generated file is stale.
- **Styling:** classes in CSS files that read the tokens (`var(--action-primary)`, `.type-body`). No inline `style` attributes, no MUI `sx`, no hex or named colors in new code.
- **Migration progress:** `node design-system/migration/count.mjs <src> <base src>` counts files importing `@mui`, inline `style={{}}` blocks and `sx` props outside `src/ui`. CI writes the table to each pull request's summary and marks the step when a count goes up; it's informational and doesn't fail the pull request.
- **Components:** pure components in `src/ui/` render only from props, with every state controlled by props, and take no `className` or `style`; data loading lives in a separate wrapper. Write each component's tests from its Figma spec before the component. Build once and reuse; never copy a function or component.
- **Accessibility:** `npm run docs:test` runs axe and keyboard, focus, target size, reflow, text size, forced colors and reduced motion checks on every docs page. CI requires it.
- **Published docs:** the docs are built into the app at `/design-system/`, so they're at https://neurosift.app/design-system/ after each deploy and in every pull request's preview (`deploy.yml`, `preview-build.yml`). `DOCS_BASE=/design-system/ npm run docs:test` runs the suite under that path, including a check that every link and asset responds.
- **Comments:** only where the code can't explain itself, two lines at most. If a comment restates a name, rename instead.
- **New tokens or token groups** get a page in `design-system/docs/src/pages` and an entry in `design-system/docs/src/navigation.ts`.
- Astro runs its dev server in the background when it detects a coding agent; stop it with `npx astro dev stop` in `design-system/docs`.
