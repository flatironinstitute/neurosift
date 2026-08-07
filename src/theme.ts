import { createTheme } from "@mui/material/styles";

// The single MUI theme used by the app. Kept in its own module (rather than
// inline in App.tsx) so that Storybook and other harnesses can render
// components against the exact same palette the app uses.
export const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#2c3e50",
      dark: "#1a2530",
      light: "#3e5771",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#9c27b0",
      dark: "#7b1fa2",
      light: "#ba68c8",
      contrastText: "#ffffff",
    },
    text: {
      primary: "rgb(33, 33, 33)",
      secondary: "rgb(66, 66, 66)",
    },
    background: {
      default: "rgb(250, 250, 250)",
      paper: "#ffffff",
    },
  },
});

export default appTheme;
