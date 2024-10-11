import {
  RemoteH5File,
  RemoteH5FileLindi,
  RemoteH5FileX,
} from "@remote-h5-file/index";
import { ORMessage, ORTool } from "app/ContextChat/openRouterTypes";
import {
  fetchDandisetVersionInfo,
  fetchNwbFilesForDandiset,
} from "app/pages/DandisetPage/DandisetViewFromDendro/DandisetView";
import getNwbFileInfoForChat from "app/pages/NwbPage/getNwbFileInfoForChat";
import { tryGetLindiUrl } from "app/pages/NwbPage/NwbPage";
import { Route } from "app/useRoute";
import { NeurosiftCompletionClient } from "NwbchatClient/NwbchatClient";

const doChatCompletion = async (a: {
  messages: ORMessage[];
  route: Route;
  modelName: string;
  nwbFileUrl?: string;
  urlType?: string;
  resourceUrls?: string[];
}) => {
  const { messages, route, modelName, nwbFileUrl, urlType } = a;
  const client = new NeurosiftCompletionClient({ verbose: true });
  const initialSystemMessage: ORMessage = {
    role: "system",
    content: getInitialSystemMessageForRoute(route, { nwbFileUrl, urlType }),
  };
  const resourceSystemMessages: ORMessage[] = [];
  if (a.resourceUrls) {
    for (const url of a.resourceUrls) {
      const text = await loadResource(url);
      if (text) {
        console.info(`Using resource at ${url} (length = ${text.length})`);
        resourceSystemMessages.push({
          role: "system",
          content: `Here is the resource at ${url}:\n\n${text}\n`,
        });
      }
    }
  }
  const tools = getToolsForRoute(route);
  for (const t of allTools) {
    if (!(t.tool.function.name in allToolFunctions)) {
      throw new Error(`Tool function ${t.tool.function.name} not found`);
    }
  }
  const messages2: ORMessage[] = [
    initialSystemMessage,
    ...resourceSystemMessages,
    ...messages,
  ];
  const { response, toolCalls } = await client.completion(
    messages2,
    modelName,
    tools,
  );

  return { assistantMessage: response, toolCalls };
};

const toolDandisetsList: ORTool = {
  type: "function",
  function: {
    description: "Get a list of Dandisets",
    name: "dandisets_list",
    parameters: {
      type: "object",
      properties: {
        search_term: {
          type: "string",
          description: "Search term for lexical search",
        },
        page: {
          type: "integer",
          description:
            "A page number within the paginated result set, 1-indexed",
        },
        page_size: {
          type: "integer",
          description:
            "The number of results to return per page (you should limit this to 20 or less)",
        },
      },
    },
  },
};

const toolDandisetsListFunc = async (args: {
  search_term: string;
  page: number;
  page_size: number;
}) => {
  const { search_term, page, page_size } = args;
  const url = `https://api.dandiarchive.org/api/dandisets/?search=${search_term || ""}&page=${page || 1}&page_size=${page_size || 10}`;
  const response = await fetch(url);
  const json = await response.json();
  return JSON.stringify(json);
};

const toolDandisetInfo: ORTool = {
  type: "function",
  function: {
    description: "Get information about a Dandiset",
    name: "dandiset_info",
    parameters: {
      type: "object",
      properties: {
        dandiset_id: {
          type: "string",
          description: "The Dandiset ID",
        },
        dandiset_version: {
          type: "string",
          description:
            "The Dandiset version (defaults to draft if empty string)",
        },
        staging: {
          type: "boolean",
          description: "Whether to use the staging server",
        },
      },
    },
  },
};

const toolDandisetInfoFunc = async (args: {
  dandiset_id: string;
  dandiset_version?: string;
  staging?: boolean;
}) => {
  const dandisetVersionInfo = await fetchDandisetVersionInfo(
    args.dandiset_id,
    args.dandiset_version || "draft",
    args.staging,
  );
  return JSON.stringify(dandisetVersionInfo);
};

const toolNwbFilesForDandiset: ORTool = {
  type: "function",
  function: {
    description:
      "Get a list of NWB files for a Dandiset. Returns the path, URL, size, created date, and modified date for each file.",
    name: "nwb_files_for_dandiset",
    parameters: {
      type: "object",
      properties: {
        dandiset_id: {
          type: "string",
          description: "The Dandiset ID",
        },
        dandiset_version: {
          type: "string",
          description:
            "The Dandiset version (defaults to draft if empty string)",
        },
        staging: {
          type: "boolean",
          description: "Whether to use the staging server",
        },
        max_num_assets: {
          type: "integer",
          description:
            "The maximum number of assets to return. Defaults to 100.",
        },
      },
    },
  },
};

const toolNwbFilesForDandisetFunc = async (args: {
  dandiset_id: string;
  dandiset_version?: string;
  staging?: boolean;
  max_num_assets?: number;
}) => {
  const x = await fetchNwbFilesForDandiset({
    dandisetId: args.dandiset_id,
    dandisetVersion: args.dandiset_version || "draft",
    useStaging: args.staging || false,
    maxNumAssets: args.max_num_assets || 100,
  });
  return JSON.stringify(
    x.map((y) => ({
      path: y.path,
      url: `https://${args.staging ? "api-staging" : "api"}.dandiarchive.org/api/assets/${y.asset_id}/download/`,
      size: y.size,
      created: y.created,
      modified: y.modified,
    })),
  );
};

const toolNwbFileInfo: ORTool = {
  type: "function",
  function: {
    description:
      "Get information about an NWB file. It's important to supply both the URL and the Dandiset ID.",
    name: "nwb_file_info",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description:
            "The URL of the NWB file obtained from nwb_files_for_dandiset tool",
        },
        dandiset_id: {
          type: "string",
          description: "The Dandiset ID (required for Lindi URLs)",
        },
      },
    },
  },
};

const toolNwbFileInfoFunc = async (args: {
  url: string;
  dandiset_id: string;
}) => {
  const urlLindi = await tryGetLindiUrl(args.url, args.dandiset_id);
  let nwbFile: RemoteH5FileX;
  if (urlLindi) {
    nwbFile = await RemoteH5FileLindi.create(urlLindi);
  } else {
    nwbFile = new RemoteH5File(args.url, {});
  }
  const info = await getNwbFileInfoForChat(nwbFile);
  return JSON.stringify(info);
};

const toolGetPynappleDocs: ORTool = {
  type: "function",
  function: {
    description: "Get Pynapple documentation",
    name: "get_pynapple_docs",
    parameters: {
      type: "object",
      properties: {},
    },
  },
};

const toolGetPynappleDocsFunc = async () => {
  return pynappleDocs;
};

export const allTools: {
  tool: ORTool;
  func: (args: any) => Promise<any>;
}[] = [
  {
    tool: toolDandisetsList,
    func: toolDandisetsListFunc,
  },
  {
    tool: toolDandisetInfo,
    func: toolDandisetInfoFunc,
  },
  {
    tool: toolNwbFilesForDandiset,
    func: toolNwbFilesForDandisetFunc,
  },
  {
    tool: toolNwbFileInfo,
    func: toolNwbFileInfoFunc,
  },
  {
    tool: toolGetPynappleDocs,
    func: toolGetPynappleDocsFunc,
  },
];

export const allToolFunctions: {
  [toolName: string]: (args: any) => Promise<any>;
} = {};
for (const t of allTools) {
  allToolFunctions[t.tool.function.name] = t.func;
}

const getToolsForRoute = (route: Route): ORTool[] => {
  if (route.page === "dandi" || route.page === "dandi-query") {
    return [toolDandisetsList];
  } else if (route.page === "dandiset") {
    return [toolDandisetInfo, toolNwbFilesForDandiset, toolNwbFileInfo];
  } else if (route.page === "nwb") {
    return [toolDandisetInfo, toolNwbFileInfo, toolGetPynappleDocs];
  } else {
    return [];
  }
};

const introText = `
You are a helpful assistant that provides answers to technical questions.

Answer questions completely but do not be overly verbose.

The user is chatting with you in a chat window of software called Neurosift.

You should stick to answering questions related to the software and its usage, data being analyzed and visualized, and neuroscience data in general.

You should provide answers based on the context of the conversation and not hallucinate or provide false information.

Neurosift is a browser-based tool designed for the visualization of NWB (Neurodata Without Borders) files, whether stored locally or hosted remotely, and enables interactive exploration of the DANDI Archive.

When you mention Neurosift, you should use the following link:
[Neurosift](https://github.com/flatironinstitute/neurosift)
`;

const aboutDandiText = `
DANDI is a public archive of neurophysiology datasets, including raw and processed data, and associated software containers. Datasets are shared according to a Creative Commons CC0 or CC-BY licenses. The data archive provides a broad range of cellular neurophysiology data. This includes electrode and optical recordings, and associated imaging data using a set of community standards: NWB:N - NWB:Neurophysiology, BIDS - Brain Imaging Data Structure, and NIDM - Neuro Imaging Data Model. Development of DANDI is supported by the National Institute of Mental Health.
Source: https://registry.opendata.aws/dandiarchive

The DANDI platform is supported by the BRAIN Initiative for publishing, sharing, and processing neurophysiology data. The archive accepts cellular neurophysiology data including electrophysiology, optophysiology, and behavioral time-series, and images from immunostaining experiments. The platform is now available for data upload and distribution. The storage of data in the archive is also supported by the Amazon Opendata program.
Source: https://www.dandiarchive.org/

Why DANDI?
As an exercise, let’s assume you lose all the data in your lab. What would you want from the archive? Our hope is that your answer to this question, the necessary data and metadata that you need, is at least what we should be storing.

DANDI provides:
A cloud-based platform to store, process, and disseminate data. You can use DANDI to collaborate and publish datasets.
Open access to data to enable secondary uses of data outside the intent of the study.
Optimize data storage and access through partnerships, compression and accessibility technologies.
Enables reproducible practices and publications through data standards such as NWB and BIDS, which provide extensive metadata.
The platform is not just an endpoint to dump data, it is intended as a living repository that enables collaboration within and across labs, and for others, the entry point for research.
Source: https://www.dandiarchive.org/

When you mention the DANDI Archive, you should use the following link:
[DANDI Archive](https://www.dandiarchive.org/)

You can also mention the [DANDI data portal](https://dandiarchive.org) which is where you can browse Dandisets.
`;

const loadInPynwbInstructions = (nwbFileUrl: string, urlType: string) => `
Here are instructions for loading this NWB file into pynwb:

# Prerequisites:
pip install --upgrade lindi pynwb

\`\`\`python
import pynwb
import lindi

url = '${nwbFileUrl}'

# Load the remote NWB file
${urlType === "lindi" ? "f = lindi.LindiH5pyFile.from_lindi_file(url)" : "f = lindi.LindiH5pyFile.from_hdf5_file(url)"}
io = pynwb.NWBHDF5IO(file=f, mode='r')
nwbfile = io.read()

# Access the data
print(nwbfile)

# Close the file
io.close()
\`\`\`

Tip: when using Timeseries objects with pynwb it's better to use the x.get_timestamps() method rather than x.timestamps, because sometimes start_time and rate is used instead.
`;

const pynappleDocs = `
To load an NWB Units object into Pynapple, do the following:
\`\`\`python
import pynapple as nap
# ... get the pynwb file object 'nwbfile' ...
nwbp = nap.NWBFile(nwbfile)
units = nwbp["units"]  # TsGroup
print(units)
\`\`\`
However this is not be a good idea if there are a very large number of spikes.

To load an NWB timeseries object into Pynapple, do the following:
Suppose the object is at path "/processing/name_of_timeseries"
and suppose we have already loaded the NWB file into a variable called 'nwbfile'.
\`\`\`python
import pynapple as nap
nwbp = nap.NWBFile(nwbfile)
ts = nwbp["name_of_timeseries"]
\`\`\`
Note that this is referenced by "name_of_timeseries" and not the full path.
This will be a Ts object if the timeseries is 1D, a TsdFrame object if it is 2D, and a TsdTensor object if it is 3D or more.

Similarly, NWB AnnotationsSeries objects can be loaded as Pynapple Ts objects, and NWB TimeIntervals objects can be loaded as Pynapple IntervalSet objects.

Here's an example of how to create 2D tuning curves using Pynapple:
\`\`\`python
import pynapple as nap
# ... get the pynwb file object 'nwbfile' ...
nwbp = nap.NWBFile(nwbfile)
units = nwbp["units"]
position = nwbp["position"]
tc, binsxy = nap.compute_2d_tuning_curves(units, position, 20)

import matplotlib.pyplot as plt
plt.figure(figsize=(15, 7))
for i in tc.keys():
    plt.subplot(2, 4, i + 1)
    plt.imshow(tc[i], origin="lower", aspect="auto")
    plt.title("Unit {}".format(i))
plt.tight_layout()
plt.show()
\`\`\`
`;

const getInitialSystemMessageForRoute = (
  route: Route,
  o: { nwbFileUrl?: string; urlType?: string },
): string => {
  if (route.page === "dandi") {
    return `
${introText}

${aboutDandiText}

The user is viewing a list of Dandisets, each with a title and meta information such as the contact person, the date created and modified, the number of assets and the total size.

They can filter the list by entering a search term in the search bar.

They can also click the "advanced query" link to search for Dandisets by neurodata type or by semantic relevance.

They can also toggle between the main and staging site using a link.

IMPORTANT: Whenever you refer to a Dandiset by its ID, use a link like the following [000000](?page=dandiset&dandisetId=000000).

${route.staging ? "They are currently viewing the staging site." : "They are currently viewing the main site."}
`;
  } else if (route.page === "dandi-query") {
    return `
${introText}

${aboutDandiText}

The user is viewing the advanced query page.

They can search for Dandisets by neurodata type using the "Search by Neurodata Type" tab.

They can search for Dandisets by semantic similarity by pasting in relevant text or a scientific abstract using the "Search by abstract" tab.

To to a standard lexical search, they can return to the main page by clicking the Neurosift logo in the upper left corner.
`;
  } else if (route.page === "dandiset") {
    return `
${introText}

${aboutDandiText}

The user is viewing Dandiset ${route.dandisetId} version ${route.dandisetVersion || "draft"}.

If the user asks about this dandiset you should first get information about it using the tool "dandiset_info". However, don't call that tool more than once in the conversation.

If you need to know about the NWB assets in this dandiset you should use the tool "nwb_files_for_dandiset".

If you need to know about the neurodata types in this dandiset then you should sample one or more of the NWB files by using the tool "nwb_file_info". This requires that you know the URL of the NWB file, and that comes from the "nwb_files_for_dandiset" tool.
`;
  } else if (route.page === "nwb") {
    return `
${introText}

${aboutDandiText}

This user is viewing an NWB file.

${route.dandisetId ? `The NWB file is part of Dandiset ${route.dandisetId}.` : ""}

The URL for this NWB file is ${route.url}.

If the user asks about this NWB file you should use the tool "nwb_file_info".

${route.dandisetId ? `You can also get information of this file in the context of its Dandiset by using the tool "dandiset_info".` : ""}

${o.nwbFileUrl ? loadInPynwbInstructions(o.nwbFileUrl || "", o.urlType || "") : ""}

Whenever possible, provide complete Python scripts that the user can copy and paste into their own Python environment. This will usually involve loading the NWB file using the above instructions and then accessing the data of interest.

If you want to load objects into Pynapple, you should load the Pynapple docs using the tool "get_pynapple_docs". This includes instructions for loading NWB Units objects, NWB timeseries objects, and creating 2D tuning curves.

When creating a script, it's best if you have already examined the structure of the NWB using the "nwb_file_info" tool.
`;
  } else {
    return `
${introText}

${aboutDandiText}
`;
  }
};

export const getSuggestedQuestionsForRoute = (route: Route): string[] => {
  if (route.page === "dandi") {
    return ["What is Neurosift?", "What is the DANDI Archive?"];
  } else if (route.page === "dandiset") {
    return [
      "Provide an overview of this Dandiset",
      "Summarize the NWB files in this Dandiset",
      "What are the Neurodata types in this Dandiset?",
    ];
  } else if (route.page === "nwb") {
    return ["Provide a Python script for loading these data."];
  } else {
    return [];
  }
};

export const getChatTitleForRoute = (route: Route): string => {
  if (route.page === "dandi") {
    return "Ask about Neurosift and DANDI";
  } else if (route.page === "dandi-query") {
    return `Ask about querying DANDI`;
  } else if (route.page === "dandiset") {
    return `Ask about Dandiset ${route.dandisetId}`;
  } else if (route.page === "nwb") {
    return `Ask about this NWB file`;
  } else {
    return "";
  }
};

const loadResourceCache: { [url: string]: string } = {};

const loadResource = async (url: string) => {
  if (url in loadResourceCache) {
    return loadResourceCache[url];
  }
  const url2 = resolveRawGithubUrl(url);
  const response = await fetch(url2);
  if (!response.ok) {
    console.warn(`Unable to load resource: ${url2}`);
    loadResourceCache[url] = "";
    return "";
  }
  let text = await response.text();
  if (url.endsWith(".ipynb")) {
    // strip the outputs - because this may include large binary data
    let json = JSON.parse(text);
    json = {
      ...json,
      cells: json.cells.map((cell: any) => {
        if (cell.cell_type === "code") {
          return {
            ...cell,
            outputs: [],
          };
        }
        return cell;
      }),
    };
    text = JSON.stringify(json);
  }
  loadResourceCache[url] = text;
  return text;
};

const resolveRawGithubUrl = (url: string) => {
  // https://github.com/magland/dandiset-notes/blob/main/dandisets/001037/001037.ipynb -> https://raw.githubusercontent.com/magland/dandiset-notes/main/dandisets/001037/001037.ipynb
  const parts = url.split("/");
  if (
    parts.length >= 8 &&
    parts[0] === "https:" &&
    parts[1] === "" &&
    parts[2] === "github.com"
  ) {
    const user = parts[3];
    const repo = parts[4];
    const branch = parts[6];
    const path = parts.slice(7).join("/");
    return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${path}`;
  }
  return url;
};

export default doChatCompletion;
