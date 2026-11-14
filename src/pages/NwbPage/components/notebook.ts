/** What a downloaded notebook holds: a heading, a short intro, what to install, then the script. */
export interface NotebookContent {
  title: string;
  intro: string;
  /** A shell install line such as "pip install pynwb lindi"; it runs as %pip in the notebook. */
  install?: string;
  script: string;
}

type Cell = {
  id: string;
  cell_type: "markdown" | "code";
  metadata: Record<string, never>;
  source: string[];
  outputs?: [];
  execution_count?: null;
};

// nbformat stores a cell's source as lines that keep their newline, except the last.
const lines = (text: string) =>
  text
    .split("\n")
    .map((line, i, all) => (i < all.length - 1 ? `${line}\n` : line));

/** Splits a script where a comment starts a new step after a blank line, so each step is its own cell. */
export const scriptCells = (script: string): string[] => {
  const cells: string[][] = [[]];
  const rows = script.trim().split("\n");
  rows.forEach((row, i) => {
    const startsStep =
      row.startsWith("#") && i > 0 && rows[i - 1].trim() === "";
    if (startsStep && cells[cells.length - 1].some((r) => r.trim()))
      cells.push([]);
    cells[cells.length - 1].push(row);
  });
  return cells.map((c) => c.join("\n").trim()).filter(Boolean);
};

/** An nbformat 4.5 notebook as JSON text, ready to save as .ipynb. */
export const buildNotebook = ({
  title,
  intro,
  install,
  script,
}: NotebookContent) => {
  const sources: [Cell["cell_type"], string][] = [
    ["markdown", `# ${title}\n\n${intro}`],
    ...(install
      ? [["code", `%${install}`] as [Cell["cell_type"], string]]
      : []),
    ...scriptCells(script).map((s): [Cell["cell_type"], string] => ["code", s]),
  ];
  const cells: Cell[] = sources.map(([type, source], i) => ({
    id: `cell-${i + 1}`,
    cell_type: type,
    metadata: {},
    source: lines(source),
    ...(type === "code" ? { outputs: [], execution_count: null } : {}),
  }));
  const notebook = {
    cells,
    metadata: {
      kernelspec: {
        display_name: "Python 3",
        language: "python",
        name: "python3",
      },
      language_info: { name: "python" },
    },
    nbformat: 4,
    nbformat_minor: 5,
  };
  return `${JSON.stringify(notebook, null, 1)}\n`;
};

/** A file name for the notebook from the NWB file's name, such as sub-35_ses-1.ipynb or sub-35_ses-1-units.ipynb. */
export const notebookFileName = (file: string, objectPath?: string) => {
  const stem = (file.split("/").pop() || "neurosift").replace(
    /\.nwb(\.lindi\.json)?$/,
    "",
  );
  const object = objectPath?.split("/").filter(Boolean).pop();
  const safe = (s: string) => s.replace(/[^A-Za-z0-9._+-]+/g, "_");
  return `${safe(stem)}${object ? `-${safe(object)}` : ""}.ipynb`;
};

/** Saves the notebook through a temporary link, which is how a browser downloads generated text. */
export const downloadNotebook = (
  fileName: string,
  content: NotebookContent,
) => {
  const blob = new Blob([buildNotebook(content)], {
    type: "application/x-ipynb+json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};
