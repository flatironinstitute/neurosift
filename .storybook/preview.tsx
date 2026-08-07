import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import type { Preview } from "@storybook/react-vite";
import "../src/css/index.css";
import "../src/css/App.css";
import { appTheme } from "../src/theme";

const preview: Preview = {
  // Every story renders inside the app's ThemeProvider so that MUI components
  // pick up the same palette and typography they get in the running app.
  decorators: [
    (Story) => (
      <ThemeProvider theme={appTheme}>
        <CssBaseline />
        <Story />
      </ThemeProvider>
    ),
  ],
  parameters: {
    backgrounds: {
      default: "app",
      values: [
        { name: "app", value: "rgb(250, 250, 250)" },
        { name: "paper", value: "#ffffff" },
      ],
    },
  },
};

export default preview;
