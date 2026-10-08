import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchDatasetInfo, fetchDirectoryFiles } from "./openNeuroApi";

// The fields of OpenNeuro's DatasetFile type as of October 2026 (API version
// 5.8.0), from an introspection query. "key" used to be among them.
const DATASET_FILE_FIELDS = [
  "annexed",
  "directory",
  "filename",
  "id",
  "size",
  "urls",
];

const file = (id: string, filename: string, directory = false) => ({
  id,
  filename,
  directory,
  size: 10,
  urls: [`https://openneuro.org/crn/datasets/ds000001/objects/${id}`],
});

// Stands in for the OpenNeuro GraphQL endpoint. Like the real one, it rejects
// a query that selects a field DatasetFile does not have.
const mockOpenNeuro = () => {
  const requests: { operationName: string; variables: any }[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status });

  vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
    const { operationName, variables, query } = JSON.parse(String(init.body));
    requests.push({ operationName, variables });

    const selection = /files\s*(\([^)]*\))?\s*\{([^}]*)\}/.exec(query)?.[2];
    for (const field of selection?.split(/\s+/).filter(Boolean) ?? []) {
      if (!DATASET_FILE_FIELDS.includes(field)) {
        return json(400, {
          errors: [
            {
              message: `Cannot query field "${field}" on type "DatasetFile".`,
            },
          ],
        });
      }
    }

    if (operationName === "dataset") {
      return json(200, {
        data: {
          dataset: {
            id: variables.datasetId,
            snapshots: [
              { id: "a", created: "2018-07-14T01:16:37.000Z", tag: "00006" },
              { id: "b", created: "2020-05-14T14:56:55.000Z", tag: "1.0.0" },
            ],
          },
        },
      });
    }
    if (variables.tree) {
      return json(200, {
        data: { snapshot: { files: [file("f2", "sub-01_T1w.nii.gz")] } },
      });
    }
    return json(200, {
      data: {
        snapshot: {
          id: `${variables.datasetId}:${variables.tag}`,
          tag: variables.tag,
          created: "2020-05-14T14:56:55.000Z",
          size: 100,
          description: { Name: "Balloon Analog Risk-taking Task", Authors: [] },
          files: [file("f1", "README"), file("d1", "sub-01", true)],
          summary: null,
          analytics: { downloads: 1, views: 2 },
        },
      },
    });
  });
  return requests;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchDatasetInfo", () => {
  it("loads the latest snapshot with its top-level files", async () => {
    const requests = mockOpenNeuro();
    const info = await fetchDatasetInfo("ds000001");

    expect(requests.map((r) => r.operationName)).toEqual([
      "dataset",
      "snapshot",
    ]);
    expect(info.snapshot.tag).toBe("1.0.0");
    expect(info.snapshot.files).toEqual([
      expect.objectContaining({
        id: "f1",
        key: "f1",
        filename: "README",
        filepath: "README",
        parentId: "",
        directory: false,
      }),
      expect.objectContaining({
        id: "d1",
        filepath: "sub-01",
        directory: true,
      }),
    ]);
  });

  it("uses the given snapshot tag without looking up the latest", async () => {
    const requests = mockOpenNeuro();
    const info = await fetchDatasetInfo("ds000001", "00006");
    expect(requests.map((r) => r.operationName)).toEqual(["snapshot"]);
    expect(info.snapshot.tag).toBe("00006");
  });

  it("reports why OpenNeuro rejected a query", async () => {
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(
          JSON.stringify({ errors: [{ message: "Cannot query field" }] }),
          { status: 400 },
        ),
    );
    await expect(fetchDatasetInfo("ds000001", "1.0.0")).rejects.toThrow(
      "Failed to fetch OpenNeuro dataset: Cannot query field",
    );
  });
});

describe("fetchDirectoryFiles", () => {
  it("lists a directory's files under the parent's path", async () => {
    const requests = mockOpenNeuro();
    const files = await fetchDirectoryFiles("ds000001", "1.0.0", {
      id: "d1",
      filepath: "sub-01",
    });
    expect(requests[0].variables.tree).toBe("d1");
    expect(files).toEqual([
      expect.objectContaining({
        id: "f2",
        key: "f2",
        filename: "sub-01_T1w.nii.gz",
        filepath: "sub-01/sub-01_T1w.nii.gz",
        parentId: "d1",
      }),
    ]);
  });
});
