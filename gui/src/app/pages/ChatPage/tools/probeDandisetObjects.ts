import { ToolItem } from "../ToolItem";

const dandisetObjectsDetailedDescription = `
You use this tool to probe a Dandiset for neurodata objects.

For a given dandiset, the JSON object which is the input argument to the provided function has the following schema

Schema:
{
    "files": [
        {
            "dandiset_id": "000000", // the unique identifier of the dandiset
            "dandiset_version": "", // the version of the dandiset
            "file_path": "path/of/file1.nwb",
            "download_url": "..." // the download url of the file
        },
        ...
    ],
    "objects": [
        {
            "dandiset_id": "000000", // the unique identifier of the dandiset
            "dandiset_version": "", // the version of the dandiset
            "file_path": "path/of/file1.nwb",
            "download_url": "...",
            "object_path": "/path/to/neurodata_object1",
            "neurodata_type": "object_type1"
        },
        ...
    ]
}

Here's an example where you return the files in a given Dandiset:

function probe_dandiset_objects(dandiset_objects) {
    return dandiset_objects.files;
}

Here's an example where you return the neurodata objects of type Units in a given Dandiset:

function probe_dandiset_objects(dandiset_objects) {
    return dandiset_objects.objects.filter(o => o.neurodata_type === "Units");
}

It's good to return the full objects in the response, so they can be used in future parts of the chat.

Here's an example where you return the files that contain a Units object in a given Dandiset:

function probe_dandiset_objects(dandiset_objects) {
    const objects = dandiset_objects.objects.filter(o => o.neurodata_type === "Units");
    return dandiset_objects.files.filter(f => objects.some(o => o.file_path === f.file_path));
}
`;

export const dandisetObjectsTool: ToolItem = {
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

const dandisetObjectsObjectCache: {
  [dandiset_id: string]: {
    objects: {
      dandiset_id: string;
      dandiset_version: string;
      file_path: string;
      download_url: string;
      object_path: string;
      neurodata_type: string;
    }[];
  };
} = {};
export const fetchDandisetObjectsObject = async (dandiset_id: string) => {
  if (dandisetObjectsObjectCache[dandiset_id]) {
    return dandisetObjectsObjectCache[dandiset_id];
  }
  const url = `https://lindi.neurosift.org/tmp/dandi/neurodata_objects/${dandiset_id}.json`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to fetch from ${url}`);
  }
  const rr = await resp.json();

  dandisetObjectsObjectCache[dandiset_id] = rr;
  return rr;
};
