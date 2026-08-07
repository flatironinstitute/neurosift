import type { StorybookConfig } from "@storybook/react-vite";
import { aliases } from "../aliases";

const config: StorybookConfig = {
  stories: ["../../stories/**/*.stories.@(ts|tsx)"],
  addons: [],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  // @storybook/react-vite picks up a vite.config.ts sitting at the project root;
  // this project keeps it in configs/, so the shared aliases are injected here
  // instead. The react plugin is supplied by the framework itself.
  viteFinal(viteConfig) {
    viteConfig.resolve = {
      ...viteConfig.resolve,
      alias: { ...viteConfig.resolve?.alias, ...aliases },
    };
    return viteConfig;
  },
};

export default config;
