# Setting up a Neurosift development environment

## Prerequisites

- A recent version of nodejs
- Visual Studio Code with the appropriate extensions (optional)

## Clone and install

```bash
git clone https://github.com/flatironinstitute/neurosift

cd neurosift/gui
yarn install
```

## Start the development server

```bash
# recommended to run this in a vscode terminal
yarn dev
```

Point your browser to http://localhost:3000/neurosift#/nwb?url=https://dandiarchive.s3.amazonaws.com/blobs/082/8f8/0828f847-62e9-443f-8241-3960985ddab3

In many cases, the page will automatically update as you modify the source code. In some cases you'll need to refresh the browser.

## Open in VS Code

Open the neurosift folder in VS Code. If everything is set up properly, the linter will show errors and warnings in the source code. That includes warnings for missing or extra dependencies in the React hooks.

The following VS Code extensions are recommended:

- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- GitHub Copilot (optional)

## Getting started

See:

- gui/src/pages/NwbPage/viewPlugins/viewPlugins.ts
- gui/src/pages/NwbPage/viewPlugins/viewPlugins/HelloWorld/

