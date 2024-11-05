import { ToolItem } from "../ToolItem";

const probeUnitsColnamesDetailedDescription = `
You use this tool to probe a json object by executing a javascript function defined in the input parameter function_text.

The json object is described here:

~~~
This is a json file that contains the colnames for all the Units tables in nwb files in public dandisets on dandi.

    Schema:
    {
        "dandisets": [
            {
                "dandiset_id": "000000",  # The unique identifier of the dandiset
                "colnames": ["colname1", "colname2", ...]  # A sorted list of unique colnames in Units tables
            },
            ...
        ]
    }

~~~

For example, to find which dandisets contain both the colnames "snr" and "quality", you could use the following query function:

function query(units) {
    return units.dandisets.filter(x => x.colnames.includes("snr") && x.colnames.includes("quality")).map(x => x.dandiset_id);
}

Or to find the colnames for dandi ID 000000, you could use the following query function:

function query(units) {
    return units.dandisets.find(x => x.dandiset_id === "000000").colnames;
}
`;

export const unitsColnamesTool: ToolItem = {
  tool: {
    type: "function" as any,
    function: {
      name: "probe_units_colnames",
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
              "A javascript function that takes one argument, the json object described above, and returns useful information about the units colnames.",
          },
        },
      },
    },
  },
  detailedDescription: probeUnitsColnamesDetailedDescription,
  function: async (
    args: any,
    onLogMessage: (title: string, message: string) => void,
  ) => {
    const function_text: string = args.function_text;
    onLogMessage("probe_units_colnames query", function_text);
    const unitsColnamesObject = await fetchUnitsColnamesObject();
    if (!unitsColnamesObject) {
      throw new Error("Failed to fetch units colnames object");
    }
    const func = new Function(
      "units_colnames_index",
      `return (${function_text})(units_colnames_index);`,
    );
    const ret = func(unitsColnamesObject);
    onLogMessage("probe_units_colnames response", JSON.stringify(ret));
    return ret;
  },
};

let unitsColnamesObjectCache: string | null = null;
export const fetchUnitsColnamesObject = async () => {
  if (unitsColnamesObjectCache) {
    return unitsColnamesObjectCache;
  }
  const url = "https://lindi.neurosift.org/tmp/dandi/units_colnames.json";
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to fetch from ${url}`);
  }
  const rr = await resp.json();
  unitsColnamesObjectCache = rr;
  return rr;
};
