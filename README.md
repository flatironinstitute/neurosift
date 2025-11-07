# neurosift (v2)

[![DOI](https://joss.theoj.org/papers/10.21105/joss.06590/status.svg)](https://doi.org/10.21105/joss.06590)

Neurosift is a browser-based tool designed for the visualization of neuroscience data with a focus on NWB (Neurodata Without Borders) files, and enables interactive exploration of the [DANDI Archive](https://dandiarchive.org/), [EMBER Archive](https://emberarchive.org/), and [OpenNeuro](https://openneuro.org/) online repositories.

This branch contains the new (v2) version of neurosift. The previous (v1) version is available on the [main branch](https://github.com/flatironinstitute/neurosift/tree/main).

The live application is hosted at [https://neurosift.app](https://neurosift.app).

## Run locally

If you want to run neurosift on a local file, you can install it via pip and run it locally.

1. **Install neurosift:**
   ```bash
   pip install neurosift
   ```
   
2. **Run neurosift locally:**
   ```bash
   neurosift view-nwb path-to-local-nwbfile.nwb
   ```
   

## For developers

Follow these steps to install and run the app locally in development mode:

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd neurosift
   ```

2. **Initialize git submodules and install dependencies:**
   ```bash
   git submodule update --init --recursive
   npm install
   ```

   Note: The niivue_dist submodule is required for NIFTI file visualization. If you skip initializing submodules, you may encounter errors when trying to view NIFTI files.

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   The development server typically runs on [http://localhost:5173](http://localhost:5173).

## Contributions

Pull requests are welcomed. If you have suggestions, improvements, or bug fixes, please feel free to open a pull request.

Prior to submitting a pull request please be sure that the following commands run successfully:

```bash
# Prerequisites:
# pip install black
# npm install

./devel/check_format.sh
npm run build
```

If the check_format.sh fails then you will want to run the following command to format the code:

```bash
./devel/format_code.sh
```

The formatting includes:
- Python code formatting using black
- TypeScript/JavaScript code formatting using npm scripts

### Pre-commit hooks

You can use a pre-commit hook to automatically check format code before each commit.

After cloning the repository:

1. Install pre-commit:
```bash
pip install pre-commit
```

2. Install the git hook scripts:
```bash
pre-commit install
```

After this setup, code will be automatically checked for formatting when you make a commit via `./devel/format_code.sh`.

## Example Visualizations

[Neurosift Visualization Examples](https://nbfiddle.app/?url=https://gist.github.com/magland/dcddee65b7549fbf0b5e142c07ffbed0%23file-neurosift-examples-ipynb)

## MCP Tools for Cline

Neurosift provides MCP (Model Context Protocol) tools that can be used with Cline in VSCode to interact with the DANDI archive and explore neuroscience data programmatically. For installation and usage instructions, see [docs/mcp-neurosift-tools.md](docs/mcp-neurosift-tools.md).

## License

This project is licensed under the Apache 2.0 License.
