import { ToolItem } from "../ToolItem";

const computeDetailedDescription = undefined;

export type ExecuteScript = (
  script: string,
  handlers: {
    onStdout?: (message: string) => void;
    onStderr?: (message: string) => void;
    onImage?: (format: "png", content: string) => void;
  },
) => Promise<void>;

export const computeTool: ToolItem = {
  serial: true,
  tool: {
    type: "function" as any,
    function: {
      name: "compute_script",
      description: `Make a computation by executing Python code and printing the results to stdout. Returns the stdout output.`,
      parameters: {
        type: "object",
        properties: {
          script: {
            type: "string",
            description:
              "Python code that performs a computation and prints the results to stdout.",
          },
        },
      },
    },
  },
  detailedDescription: computeDetailedDescription,
  function: async (
    args: any,
    onLogMessage: (title: string, message: string) => void,
    o: {
      modelName: string;
      openRouterKey: string | null;
      executeScript?: ExecuteScript;
      onAddImage?: (name: string, url: string) => void;
      onAddFigureDataFile?: (name: string, content: string) => void;
      onStdout?: (message: string) => void;
      onStderr?: (message: string) => void;
      confirmOkayToRun?: (script: string) => Promise<boolean>;
    },
  ) => {
    const { executeScript, onAddImage, onStdout, onStderr, confirmOkayToRun } =
      o;
    if (!executeScript) {
      throw new Error("executeScript is required");
    }
    const script: string = args.script;
    onLogMessage("compute query", script);
    const stdoutLines: string[] = [];
    const onStdout2 = (message: string) => {
      onStdout && onStdout(message);
      stdoutLines.push(message);
    };
    let output: string;
    try {
      const okay = confirmOkayToRun ? await confirmOkayToRun(script) : false;
      if (!okay) {
        throw Error("User did not permit running the script");
      }
      await executeScript(script, {
        onStdout: onStdout2,
        onStderr,
        onImage: undefined,
      });
      if (stdoutLines.length === 0) {
        output = "No standard output generated";
      } else {
        output = stdoutLines.join("\n");
      }
    } catch (error: any) {
      onLogMessage("compute error", error.message);
      throw error;
    }
    onLogMessage("compute response", output);
    return output;
  },
};
