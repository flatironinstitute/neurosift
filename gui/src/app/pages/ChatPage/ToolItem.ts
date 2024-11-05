import { ORTool } from "../DandisetPage/DandisetViewFromDendro/openRouterTypes";
import { ExecuteScript } from "./tools/generateFigure";

export type ToolItem = {
    function: (
      args: any,
      onLogMessage: (title: string, message: string) => void,
      o: {
        modelName: string;
        openRouterKey: string | null;
        executeScript?: ExecuteScript;
        onAddImage?: (name: string, url: string) => void;
        onStdout?: (message: string) => void;
        onStderr?: (message: string) => void;
        confirmOkayToRun?: (script: string) => Promise<boolean>;
      },
    ) => Promise<any>;
    detailedDescription?: string;
    tool: ORTool;
  };