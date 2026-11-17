import { describe, expect, it } from "vitest";
import { buildNotebook, notebookFileName, scriptCells } from "./notebook";

const SCRIPT = `import lindi

url = 'https://example.org/f.nwb'

# Load the remote file
f = lindi.LindiH5pyFile.from_hdf5_file(url)

# load the neurodata object (Units)
X = f['/units']`;

describe("notebook", () => {
  it("splits a script into one cell per commented step", () => {
    expect(scriptCells(SCRIPT)).toEqual([
      "import lindi\n\nurl = 'https://example.org/f.nwb'",
      "# Load the remote file\nf = lindi.LindiH5pyFile.from_hdf5_file(url)",
      "# load the neurodata object (Units)\nX = f['/units']",
    ]);
  });

  it("writes valid nbformat 4.5: a heading, a %pip cell, then the code cells", () => {
    const nb = JSON.parse(
      buildNotebook({
        title: "sub-35_ses-1.nwb",
        intro: "Loads the file.",
        install: "pip install pynwb lindi",
        script: SCRIPT,
      }),
    );
    expect(nb.nbformat).toBe(4);
    expect(nb.nbformat_minor).toBe(5);
    expect(nb.metadata.kernelspec.name).toBe("python3");
    expect(nb.cells.map((c: { cell_type: string }) => c.cell_type)).toEqual([
      "markdown",
      "code",
      "code",
      "code",
      "code",
    ]);
    expect(nb.cells[0].source.join("")).toBe(
      "# sub-35_ses-1.nwb\n\nLoads the file.",
    );
    expect(nb.cells[1].source).toEqual(["%pip install pynwb lindi"]);
    expect(nb.cells[1].outputs).toEqual([]);
    expect(nb.cells[1].execution_count).toBeNull();
    const ids = nb.cells.map((c: { id: string }) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id: string) => expect(id).toMatch(/^[a-zA-Z0-9-_]+$/));
  });

  it("names the file after the NWB file and, for an object, the object", () => {
    expect(notebookFileName("sub-35/sub-35_ses-1_ecephys+image.nwb")).toBe(
      "sub-35_ses-1_ecephys+image.ipynb",
    );
    expect(
      notebookFileName(
        "sub-35/sub-35_ses-1.nwb",
        "/processing/behavior/Pose 1",
      ),
    ).toBe("sub-35_ses-1-Pose_1.ipynb");
    expect(notebookFileName("")).toBe("neurosift.ipynb");
  });
});
