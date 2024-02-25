# Neurosift Python utility

This is a simple command-line utility used to view local NWB files using Neurosift.

## Installation

```bash
pip install neurosift
```

## Usage

```bash
neurosift view-nwb /path/to/file.nwb
```

This will open a web browser window with the Neurosift web app pointing to a symlinked copy of your file. You can then browse the file and visualize its contents.

When finished, you can stop the server by pressing Ctrl-C in the terminal window.
