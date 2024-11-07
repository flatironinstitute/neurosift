import { ToolItem } from "../ToolItem";

const neurodataTypesToolDetailedDescription = `
You use this tool to probe a json object by executing a javascript function defined in the input parameter function_text.

The json object is described here:

~~~
This is a json file that contains a list of all neurodata types found in all the nwb files in public dandisets on dandi,
along with counts for how many times they occur in each dandiset.

Schema:
{
    "neurodata_types": [
        {
            "neurodata_type": "Type",  # String: The type of the neurodata object
            "dandisets": [              # List: Contains outfobjects related to each dandiset
                {
                    "dandiset_id": "000000",  # String: The 6-digit ID of the dandiset in which this neurodata type occurs
                    "count": 5                # Integer: The number of times this neurodata type appears in the dandiset
                },
                ...
            ]
        },
        ...
    ]
}
~~~

For example, to find all Dandisets that contain both Units and BehavioralEvents, you could use the following query function:

function query(neurodata) {
      const a1 = neurodata.neurodata_types.find(x => x.neurodata_type === "Units");
      const a2 = neurodata.neurodata_types.find(x => x.neurodata_type === "BehavioralEvents");
      if (!a1 || !a2) return [];
      const ds1 = a1.dandisets.map(x => x.dandiset_id);
      const ds2 = a2.dandisets.map(x => x.dandiset_id);
      return ds1.filter(x => ds2.includes(x));
}
`;

export const neurodataTypesTool: ToolItem = {
  tool: {
    type: "function" as any,
    function: {
      name: "probe_neurodata_types",
      description: `
Probe a json object by executing a javascript function defined in the input parameter function_text.
The query function takes one argument, which is a json object.
`,
      parameters: {
        type: "object",
        properties: {
          function_text: {
            type: "string",
            description:
              "A javascript function that takes one argument, the json object described above, and returns useful information about the neurodata types.",
          },
        },
      },
    },
  },
  detailedDescription: neurodataTypesToolDetailedDescription,
  function: async (
    args: any,
    onLogMessage: (title: string, message: string) => void,
  ) => {
    const function_text: string = args.function_text;
    onLogMessage("probe_neurodata_types query", function_text);
    const neurodataTypesWithCountsObject =
      await fetchNeurodataTypesWithCountsObject();
    if (!neurodataTypesWithCountsObject) {
      throw new Error("Failed to fetch neurodata types with counts object");
    }
    const func = new Function(
      "neurodata_types_index",
      `return (${function_text})(neurodata_types_index);`,
    );
    const ret = func(neurodataTypesWithCountsObject);
    onLogMessage("probe_neurodata_types response", JSON.stringify(ret));
    return ret;
  },
};

let neurodataTypesWithCountsObjectCache: string | null = null;
export const fetchNeurodataTypesWithCountsObject = async () => {
  if (neurodataTypesWithCountsObjectCache) {
    return neurodataTypesWithCountsObjectCache;
  }
  const url =
    "https://lindi.neurosift.org/tmp/dandi/neurodata_types_with_counts.json";
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to fetch from ${url}`);
  }
  const rr = await resp.json();
  neurodataTypesWithCountsObjectCache = rr;
  return rr;
};
