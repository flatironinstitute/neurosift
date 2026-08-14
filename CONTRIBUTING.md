# Contributing to Neurosift

Thank you for your interest in contributing. Neurosift is a browser-based tool for visualizing neuroscience data, with a focus on NWB files and the DANDI Archive. This document describes how to report problems effectively and how to set up a development environment.

## Reporting Problems with a Visualization

If you are reporting an error with an existing visualization, please include both of the following in your issue:

1. **A link to the visualization.** Use the share button in the tab toolbar, or copy the full URL from your browser. The URL should include the file (`url=...`), the dandiset (`dandisetId` and `dandisetVersion`), and the object being viewed (`tab=...`), so that anyone can open exactly what you were looking at. For example:

   ```
   https://neurosift.app/nwb?url=https://api.dandiarchive.org/api/assets/<asset-id>/download/&dandisetId=000000&dandisetVersion=0.230101.0000&tab=/acquisition/my_series
   ```

2. **A screenshot of the problem.** A picture of what you see, ideally with a note about what you expected instead.

A few notes on choosing the example:

- Prefer a published dandiset version over `draft` when possible. Draft assets can be replaced or removed, and dandisets can become embargoed, which makes the report impossible to reproduce later. We have had fixes become unverifiable because the only known example lived in a draft dandiset that was later embargoed.
- If the data cannot be shared publicly, include a minimal script (for example using pynwb) that generates a small file reproducing the problem, and describe where in the file the affected object lives.

## Development Setup

```bash
git clone https://github.com/flatironinstitute/neurosift
cd neurosift
git submodule update --init --recursive
npm install
npm run dev
```

The app will be served by Vite at http://localhost:5173. To view a local NWB file during development, you can serve it with a CORS- and range-request-capable server (for example `npx http-server -p 8321 --cors`) and open `http://localhost:5173/nwb?url=http://localhost:8321/myfile.nwb`.

## Code Checks

Before opening a pull request, please make sure the following pass:

```bash
npm run format:check   # prettier (npm run format to fix)
npm run lint           # eslint
npx tsc --noEmit       # type checking
npm test               # unit tests (vitest)
```

The repository also has pre-commit hooks (formatting and codespell) that you can enable with `pre-commit install`.

## Pull Requests

- Update `CHANGELOG.md` with a brief entry describing your change.
- Every pull request, including from forks, gets an automatic preview deployment. The build runs without secrets, and a separate workflow deploys the result and comments the preview URL on the PR.
- If your change fixes or modifies a visualization, the PR description should contain a link to the fixed widget on your preview deployment and a screenshot of it, ideally alongside a link showing the before behavior on production. Use real, publicly accessible data where possible, for the same reasons as in the issue guidelines above.
- Keep changes minimal and focused. Small, reviewable diffs that fix one thing are much easier to merge than broad refactors.
