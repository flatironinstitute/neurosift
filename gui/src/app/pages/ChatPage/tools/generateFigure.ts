import { PlotlyContent } from "../PythonSessionClient";
import { ToolItem } from "../ToolItem";

const generateFigureDetailedDescription = undefined;

export type ExecuteScript = (
  script: string,
  handlers: {
    onStdout?: (message: string) => void;
    onStderr?: (message: string) => void;
    onImage?: (format: "png", content: string) => void;
    onFigure?: (format: "plotly", content: PlotlyContent) => void;
  },
) => Promise<void>;

export const generateFigureTool: (
  plotLibrary: "matplotlib" | "plotly" | "matplotlib or plotly",
) => ToolItem = (plotLibrary) => ({
  serial: true,
  tool: {
    type: "function" as any,
    function: {
      name: "figure_script",
      description: `Generate a figure by executing Python code that makes use of the ${plotLibrary} library. Returns Markdown or HTML text that can be included in the chat response. In case of error it returns the stderr.`,
      parameters: {
        type: "object",
        properties: {
          script: {
            type: "string",
            description: `Python code that generates a figure using the ${plotLibrary} library.`,
          },
        },
      },
    },
  },
  detailedDescription: generateFigureDetailedDescription,
  function: async (
    args: any,
    onLogMessage: (title: string, message: string) => void,
    o: {
      modelName: string;
      openRouterKey: string | null;
      executeScript?: ExecuteScript;
      onAddImage?: (name: string, url: string) => void;
      onAddFigureData?: (name: string, content: string) => void;
      onStdout?: (message: string) => void;
      onStderr?: (message: string) => void;
      confirmOkayToRun?: (script: string) => Promise<boolean>;
      cancelSignaler?: { onCancel: () => void };
    },
  ) => {
    const {
      executeScript,
      onAddImage,
      onAddFigureData,
      onStdout,
      onStderr,
      confirmOkayToRun,
    } = o;
    if (!executeScript) {
      throw new Error("executeScript is required");
    }
    if (!onAddImage) {
      throw new Error("onAddImage is required");
    }
    if (!onAddFigureData) {
      throw new Error("onAddFigureData is required");
    }
    const script: string = args.script;
    onLogMessage("generate_figure query", script);
    const images: { format: "png"; content: string }[] = [];
    const onImage = (format: "png", content: string) => {
      images.push({ format, content });
    };
    const figures: { format: "plotly"; content: PlotlyContent }[] = [];
    const onFigure = (format: "plotly", content: PlotlyContent) => {
      figures.push({ format, content });
    };
    const onStdout2 = (message: string) => {
      console.info(`STDOUT: ${message}`);
      onStdout && onStdout(message);
    };
    const stderrLines: string[] = [];
    const onStderr2 = (message: string) => {
      console.error(`STDERR: ${message}`);
      onStderr && onStderr(message);
      stderrLines.push(message);
    };
    let output: string = "";
    try {
      const okay = confirmOkayToRun ? await confirmOkayToRun(script) : false;
      if (!okay) {
        throw Error("User did not permit running the script");
      }
      await executeScript(script, {
        onStdout: onStdout2,
        onStderr: onStderr2,
        onImage,
        onFigure,
      });
      if (images.length === 0 && figures.length === 0) {
        output = "No image or figure generated";
        if (stderrLines.length > 0) {
          output += "\n\n" + stderrLines.join("\n");
        }
      } else {
        output = images
          .map((image, index) => {
            const imageUrl = `data:image/png;base64,${image.content}`;
            const randStr = Math.random().toString(36).substring(7);
            onAddImage(`figure_${randStr}.png`, imageUrl);
            return "![image](image://figure_" + randStr + ".png)";
          })
          .join("\n\n");
        output += figures
          .map((figure, index) => {
            const randStr = Math.random().toString(36).substring(7);
            onAddFigureData(
              `figure_${randStr}.json`,
              JSON.stringify(figure.content),
            );
            return `<div class="plotly" src="figure://figure_${randStr}.json">plotly</div>`;
          })
          .join("\n\n");
      }
    } catch (error: any) {
      onLogMessage("generate_figure error", error.message);
      if (stderrLines.length > 0) {
        output = "Error:\n\n" + error.message + "\n\n" + stderrLines.join("\n");
      } else {
        throw error;
      }
    }
    onLogMessage("generate_figure response", output);
    return output;
  },
});
