# Neurosift development environment

Neurosift is a web application built using React and TypeScript. It is [deployed to GitHub pages](https://flatironinstitute.github.io/neurosift/), but you can also run it locally for development purposes. This document describes how to set up a development environment for Neurosift.

> Tip: You can do all of this in [GitHub Codespaces](https://github.com/features/codespaces), which is a convenient way to develop web applications without having to install anything on your local machine. When you serve the application on port 4200, as described below, Codespaces will give you an option to open a new browser window to view the application. Therefore, you can develop Neurosift for free in the cloud, without downloading anything to your local machine!

Prerequisites: Linux or macOS, Node.js, and Yarn. Or, as mentioned above, you can use GitHub Codespaces, which provides all of these tools in the cloud.

First clone this repository

```bash
git clone https://github.com/flatironinstitute/neurosift
cd neurosift
```

Download the fi-sci submodule

```bash
git submodule update --init --recursive
```

<details>
<summary>About the fi-sci submodule</summary>

The source code for the frontend is now part of the [fi-sci mono-repo](https://github.com/magland/fi-sci).
The reason for this is that the frontend shares many components with other projects. Therefore, it is
most convenient to develop them all together in the same repository. The mono-repo is managed [using Nx](https://nx.dev/).

Note that issue tracking for Neurosift is still done in this neurosift repository.

</details>

Install a recent version of Node.js (e.g., version 20).

Install the required packages

```bash
cd gui/fi-sci
yarn install
```

Start the development server

```bash
# in the gui/fi-sci directory
npx nx serve neurosift
```

The development server will start (keep the terminal open) and you can access the application in your browser at `http://localhost:4200`.

You can then edit the source code located at `gui/fi-sci/apps/neurosift`, and the application will automatically reload in your browser as you make changes.

