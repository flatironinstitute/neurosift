import { JobRunnerClient } from "./experimentalSearch/jobRunnerClient";

const doDandiSemanticSearch = async (query: string): Promise<string[]> => {
  if (!query) return [];
  const client = new JobRunnerClient();
  const queryBase64 = btoa(query);
  const script = `
const dandisets = await interface.getDandisets();
const query = atob("${queryBase64}");
const dandisetsSorted = await interface.semanticSortDandisets(dandisets, query);
const dandisetIds = dandisetsSorted.map(d => d.dandiset_id).slice(0, 20);
interface.print("<>");
interface.print(JSON.stringify(dandisetIds, null, 2));
interface.print("</>");
`;
  console.info("Executing script:");
  console.info(script);
  const response = await client.executeScript(script);
  console.info("Received response:");
  console.info(response);
  const i1 = response.indexOf("<>");
  const i2 = response.indexOf("</>");
  if (i1 === -1 || i2 === -1 || i2 <= i1) {
    const errorMsg = "Could not find output markers in response";
    console.warn(errorMsg);
    throw new Error(errorMsg);
  }
  const json = response.slice(i1 + 2, i2).trim();
  let dandisetIds: string[] = [];
  try {
    dandisetIds = JSON.parse(json);
  } catch (e) {
    const errorMsg = "Could not parse JSON from response";
    console.warn(errorMsg, e);
    throw new Error(errorMsg);
  }

  return dandisetIds;
};

export default doDandiSemanticSearch;
