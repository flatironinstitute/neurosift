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
