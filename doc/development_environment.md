# Neurosift development environment

Neurosift is a web application built using React and TypeScript. It is deployed at [neurosift.app](https://neurosift.app), but you can also run it locally for development purposes. This document describes how to set up a development environment for Neurosift and add new visualizations.

> Tip: You can do all of this in [GitHub Codespaces](https://github.com/features/codespaces), which is a convenient way to develop web applications without having to install anything on your local machine. When you serve the application on port 3000, as described below, Codespaces will give you an option to open a new browser window to view the application. Therefore, you can develop Neurosift for free in the cloud, without downloading anything to your local machine!

### Prerequisites

Prerequisites: Linux or macOS, Node.js, and Yarn. Or, as mentioned above, you can use GitHub Codespaces, which provides all of these tools in the cloud.

### Clone and setup the respository

First clone this repository

```bash
git clone https://github.com/flatironinstitute/neurosift
cd neurosift
```

### Install the required packages

Install a recent version of Node.js (e.g., version 20).

Install the required packages

```bash
cd gui
yarn install
```

### Serving the app

Start the development server

```bash
# in the gui directory
yarn dev
```

The development server will start (keep the terminal open) and you can access the application in your browser at `http://localhost:3000`.

You can then edit the source code located in the `gui` directory, and the application will automatically reload in your browser as you make changes.

### Testing the view plugins

Navigate to `http://localhost:3000?p=/tests` to see a table of tests for many of the view plugins. If you make changes to view plugins, you can compare the results of the tests with the expected results at `https://neurosift.app/?p=/tests`. If you add new view plugins, it is recommended to add new tests for them.

### Improving or adding visualizations

In Neurosift, visualizations are structured into plugins. Each plugin is specifically designed to visualize a distinct neurodata type. This approach mirrors the organization of NWB files, where objects are categorized according to their neurodata types.

Plugins are registered in [gui/src/app/pages/NwbPage/viewPlugins/viewPlugins.ts](https://github.com/flatironinstitute/neurosift/blob/main/gui/src/app/pages/NwbPage/viewPlugins/viewPlugins.ts). For example, the plugin for visualizing SpatialSeries objects is registered with the following code:

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

The NeurodataSpatialSeriesItemView component is a React component [defined here](https://github.com/flatironinstitute/neurosift/blob/main/gui/src/app/pages/NwbPage/viewPlugins/SpatialSeries/SpatialSeriesWidget/NeurodataSpatialSeriesItemView.tsx). The props are

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
