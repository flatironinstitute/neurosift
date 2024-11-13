import { NeurosiftFigureContent, PlotlyContent } from "../PythonSessionClient";
import { ToolItem } from "../ToolItem";

const generateFigureDetailedDescription = undefined;

export type ExecuteScript = (
  script: string,
  handlers: {
    onStdout?: (message: string) => void;
    onStderr?: (message: string) => void;
    onImage?: (format: "png", content: string) => void;
    onFigure?: (
      a:
        | { format: "plotly"; content: PlotlyContent }
        | { format: "neurosift_figure"; content: NeurosiftFigureContent },
    ) => void;
  },
) => Promise<void>;

export const generateFigureTool: ToolItem = {
  serial: true,
  tool: {
    type: "function" as any,
    function: {
      name: "figure_script",
      description: `Generate one or more figures by executing Python code that makes use of matplotlib, plotly, or neurosift_jp. Returns one or more lines of Markdown or HTML text that can be included in the chat response (one line per figure). In case of error it returns the stderr.`,
      parameters: {
        type: "object",
        properties: {
          script: {
            type: "string",
            description: `Python code that generates one or more figures using the matplotlib, plotly, or neurosift_jp libraries.`,
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
    const figures: (
      | { format: "plotly"; content: PlotlyContent }
      | { format: "neurosift_figure"; content: NeurosiftFigureContent }
    )[] = [];
    const onFigure = (
      a:
        | { format: "plotly"; content: PlotlyContent }
        | { format: "neurosift_figure"; content: NeurosiftFigureContent },
    ) => {
      figures.push(a);
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
        const output1 = images.map((image, index) => {
          const imageUrl = `data:image/png;base64,${image.content}`;
          const randStr = Math.random().toString(36).substring(7);
          onAddImage(`figure_${randStr}.png`, imageUrl);
          return "![image](image://figure_" + randStr + ".png)";
        });
        const output2 = figures.map((figure, index) => {
          if (figure.format === "plotly") {
            const randStr = Math.random().toString(36).substring(7);
            onAddFigureData(
              `figure_${randStr}.json`,
              JSON.stringify(figure.content),
            );
            return `<div class="plotly" src="figure://figure_${randStr}.json">plotly</div>`;
          } else if (figure.format === "neurosift_figure") {
            let x = `<div class="neurosift_figure"`;
            x += ` nwb_url="${figure.content.nwb_url}"`;
            x += ` item_path="${figure.content.item_path}"`;
            if (figure.content.view_plugin_name) {
              x += ` view_plugin_name="${figure.content.view_plugin_name}"`;
            }
            if (figure.content.height) {
              x += ` height="${figure.content.height}"`;
            }
            x += `></div>`;
            return x;
          } else {
            console.warn("Unknown figure format", (figure as any).format);
            return "";
          }
        });

        output = [...output1, ...output2].join("\n");
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
};
