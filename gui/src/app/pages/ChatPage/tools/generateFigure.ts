import { ToolItem } from "../ChatWindow";

const generateFigureDetailedDescription = undefined;

export type ExecuteScript = (
  script: string,
  handlers: {
    onStdout: (message: string) => void;
    onStderr: (message: string) => void;
    onImage: (format: "png", content: string) => void;
  },
) => Promise<void>;

export const generateFigureTool: ToolItem = {
  tool: {
    type: "function" as any,
    function: {
      name: "script",
      description: `Generate a figure by executing Python code that makes use of the matplotlib library. Returns Markdown text that can be included in the chat response.`,
      parameters: {
        type: "object",
        properties: {
          script: {
            type: "string",
            description:
              "Python code that generates a figure using the matplotlib library.",
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
    },
  ) => {
    const { executeScript, onAddImage } = o;
    if (!executeScript) {
      throw new Error("executeScript is required");
    }
    if (!onAddImage) {
      throw new Error("onAddImage is required");
    }
    const script: string = args.script;
    onLogMessage("generate_figure query", script);
    const images: { format: "png"; content: string }[] = [];
    const onStdout = (message: string) => {};
    const onStderr = (message: string) => {};
    const onImage = (format: "png", content: string) => {
      images.push({ format, content });
    };
    let output: string;
    try {
      await executeScript(script, { onStdout, onStderr, onImage });
      if (images.length === 0) {
        output = "No image generated";
      } else {
        output = images
          .map((image, index) => {
            const imageUrl = `data:image/png;base64,${image.content}`;
            const randStr = Math.random().toString(36).substring(7);
            onAddImage(`figure_${randStr}.png`, imageUrl);
            return "![image](image://figure_" + randStr + ".png)";
          })
          .join("\n\n");
      }
    } catch (err: any) {
      output = `Error: ${err.message}`;
    }
    onLogMessage("generate_figure response", output);
    return output;
  },
};
