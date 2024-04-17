# Neurosift development environment

Neurosift is a web application built using React and TypeScript. It is deployed at [neurosift.app](https://neurosift.app), but you can also run it locally for development purposes. This document describes how to set up a development environment for Neurosift and add new visualizations.

> Tip: You can do all of this in [GitHub Codespaces](https://github.com/features/codespaces), which is a convenient way to develop web applications without having to install anything on your local machine. When you serve the application on port 4200, as described below, Codespaces will give you an option to open a new browser window to view the application. Therefore, you can develop Neurosift for free in the cloud, without downloading anything to your local machine!

### Prerequisites

Prerequisites: Linux or macOS, Node.js, and Yarn. Or, as mentioned above, you can use GitHub Codespaces, which provides all of these tools in the cloud.

### Clone and setup the respository

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

### Install the required packages

Install a recent version of Node.js (e.g., version 20).

Install the required packages

```bash
cd gui/fi-sci
yarn install
```

### Serving the app

Start the development server

```bash
# in the gui/fi-sci directory
npx nx serve neurosift
```

The development server will start (keep the terminal open) and you can access the application in your browser at `http://localhost:4200`.

You can then edit the source code located at `gui/fi-sci/apps/neurosift`, and the application will automatically reload in your browser as you make changes.

### Testing the view plugins

Navigate to `http://localhost:4200?p=/tests` to see a table of tests for many of the view plugins.

### Improving or adding visualizations

In Neurosift, visualizations are structured into plugins. Each plugin is specifically designed to visualize a distinct neurodata type. This approach mirrors the organization of NWB files, where objects are categorized according to their neurodata types.

Plugins are registered in [gui/fi-sci/apps/neurosift/src/app/pages/NwbPage/viewPlugins/viewPlugins.ts](https://github.com/magland/fi-sci/blob/main/apps/neurosift/src/app/pages/NwbPage/viewPlugins/viewPlugins.ts) (please pardon the long path). For example, the plugin for visualizing SpatialSeries objects is registered with the following code:

```typescript
// SpatialSeries
viewPlugins.push({
    name: 'SpatialSeries',
    neurodataType: 'SpatialSeries',
    defaultForNeurodataType: true,
    component: NeurodataSpatialSeriesItemView,
    isTimeView: true,
    getCustomPythonCode: getCustomPythonCodeForTimeSeries
})
```

This plugin has a name, a neurodataType, and a component. The defaultForNeurodataType is true, which means that this plugin will be used by default for visualizing SpatialSeries objects when they are clicked. If it were false, then the button for the plugin would appear separately. The isTimeView property is true, which means that this plugin is a timeseries visualization. In this case, time controls will appear on the left panel. The getCustomPythonCode property is a function that returns Python code that can be used to load the item into Python.

The NeurodataSpatialSeriesItemView component is a React component [defined here](https://github.com/magland/fi-sci/blob/main/apps/neurosift/src/app/pages/NwbPage/viewPlugins/SpatialSeries/SpatialSeriesWidget/NeurodataSpatialSeriesItemView.tsx). The props are

```typescript
// props for the NeurodataSpatialSeriesItemView component
type Props = {
    width: number
    height: number
    path: string
    condensed?: boolean
}
```

Here the width and height are the dimensions of the component, which dynamically change based on the size of the window. The path is the path to the SpatialSeries object within the NWB file. The condensed property is optional and is used to indicate that the component should be displayed in a condensed form. As you explore the source code, you will see that the data for this neurodata object can be accessed using the following React code:

```typescript
const nwbFile = useNwbFile()
if (!nwbFile) throw Error('Unexpected: nwbFile is undefined (no context provider)')
const dataset = useDataset(nwbFile, `${path}/data`)

// ... then use the dataset to visualize the data
```

Full API documentation is not available at this point, but you can explore the source code to see how the data are visualized. If you have questions, feel free to ask in the issue tracker.
