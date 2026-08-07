import type { StorybookConfig } from "@storybook/react-vite";

// @storybook/react-vite picks up the project's vite.config.ts automatically, so
// the `@components` / `@shared` / ... path aliases defined there work in stories
// without being repeated here.
const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.@(ts|tsx)"],
  addons: [],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
};

export default config;
