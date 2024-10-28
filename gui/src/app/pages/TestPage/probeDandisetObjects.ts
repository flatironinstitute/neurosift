import { ToolItem } from "./ChatWindow";

const dandisetObjectsDetailedDescription = `
You use this tool to probe a Dandiset for neurodata objects.

For a given dandiset, the JSON object which is the input argument to the provided function has the following schema

Schema:
{
    "files": [
        {
            "dandiset_id": "000000", // the unique identifier of the dandiset
            "dandiset_version": "", // the version of the dandiset
            "file_path": "path/of/file1.nwb", // the path of the nwb file in the dandiset
            "download_url": "...", // the download url of the nwb file
            "neurodata_objects": [
                {
                    "path": "/path/to/neurodata_object1", // the path to the neurodata object in the nwb file
                    "neurodata_type": "object_type1" // the type of the neurodata object
                },
                ...
            ]
        },
        ...
    ]
}

For example, to find all objects of type "Units" in the dandiset:

function query(dandiset) {
    return dandiset.files.flatMap(x => x.neurodata_objects.filter(y => y.neurodata_type === "Units"));
}
`;

export const dandisetObectsTool: ToolItem = {
  tool: {
    type: "function" as any,
    function: {
      name: "probe_dandiset_objects",
      description: `
Probe a json object for a dandiset by executing a javascript function defined in the input parameter function_text.
The query function takes one argument, which is a json object.
`,
      parameters: {
        type: "object",
        properties: {
          dandiset_id: {
            type: "string",
            description: "The Dandiset ID to probe for neurodata objects",
          },
          function_text: {
            type: "string",
            description:
              "A javascript function that takes one argument, the json object described above, and returns useful information about the neurodata types.",
          },
        },
      },
    },
  },
  detailedDescription: dandisetObjectsDetailedDescription,
  function: async (
    args: any,
    onLogMessage: (title: string, message: string) => void,
  ) => {
    const function_text: string = args.function_text;
    const dandiset_id: string = args.dandiset_id;
    onLogMessage(`probe_dandiset_objects query ${dandiset_id}`, function_text);
    const dandisetObjectsObject = await fetchDandisetObjectsObject(dandiset_id);
    if (!dandisetObjectsObject) {
      throw new Error("Failed to fetch dandiset objects object");
    }
    const func = new Function(
      "dandiset_objects",
      `return (${function_text})(dandiset_objects);`,
    );
    const ret = func(dandisetObjectsObject);
    onLogMessage("probe_dandiset_objects response", JSON.stringify(ret));
    return ret;
  },
};

let dandisetObjectsObjectCache: string | null = null;
export const fetchDandisetObjectsObject = async (dandiset_id: string) => {
  if (dandisetObjectsObjectCache) {
    return dandisetObjectsObjectCache;
  }
  const url = `https://lindi.neurosift.org/tmp/dandi/neurodata_objects/${dandiset_id}.json`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to fetch from ${url}`);
  }
  const rr = await resp.json();
  dandisetObjectsObjectCache = rr;
  return rr;
};
