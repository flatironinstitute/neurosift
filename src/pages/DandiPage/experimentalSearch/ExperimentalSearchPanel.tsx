import { FunctionComponent, useEffect, useState } from "react";
import { JobRunnerClient } from "./jobRunnerClient";

type ExperimentalSearchPanelProps = {
  setDandisetIds?: (ids: string[]) => void;
};

type Filter = {
  contactPerson?: string | undefined;
};

export const ExperimentalSearchPanel: FunctionComponent<
  ExperimentalSearchPanelProps
> = ({ setDandisetIds }) => {
  const [jobRunnerClient, setJobRunnerClient] = useState<
    JobRunnerClient | undefined
  >(undefined);
  const [jobRunnerClientIsAlive, setJobRunnerClientIsAlive] =
    useState<boolean>(false);
  useEffect(() => {
    let client: JobRunnerClient;
    try {
      client = new JobRunnerClient();
    } catch (error) {
      console.error("Failed to initialize JobRunnerClient:", error);
      setJobRunnerClient(undefined);
      return;
    }
    client.onStatusChange(() => {
      setJobRunnerClientIsAlive(client.isAlive());
    });
    setJobRunnerClient(client);
    return () => {
      client.dispose();
    };
  }, []);
  const [filter, setFilter] = useState<Filter>({
    contactPerson: undefined,
  });
  const { allContactPersons } = useAllContactPersons(jobRunnerClient);
  const { dandisetIds } = useSearch(jobRunnerClient, filter);
  useEffect(() => {
    if (setDandisetIds) {
      setDandisetIds(dandisetIds);
    }
  }, [dandisetIds, setDandisetIds]);
  if (!jobRunnerClient) {
    return <div>No job runner is configured.</div>;
  }
  if (!jobRunnerClientIsAlive) {
    return <div>Waiting for job runner to initialize...</div>;
  }
  console.info({ dandisetIds });
  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <strong>Experimental Search Under Construction</strong>
      </div>
      {allContactPersons && (
        <div>
          <div style={{ marginBottom: 10 }}>Contact person:</div>
          <select
            value={filter.contactPerson || ""}
            onChange={(e) =>
              setFilter({
                ...filter,
                contactPerson: e.target.value || undefined,
              })
            }
            style={{ width: 300, height: 30 }}
          >
            <option value="">All contact persons</option>
            {allContactPersons.map((person) => (
              <option key={person} value={person}>
                {person}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

const useAllContactPersons = (jobRunnerClient: JobRunnerClient | undefined) => {
  const script = `
const dandisets = await interface.getDandisets();
let contactPersons = [];
for (const dandiset of dandisets) {
  contactPersons.push(dandiset.contact_person);
}
// unique and alphabetically sorted
contactPersons = [...new Set(contactPersons)].sort();
interface.print("<>" + JSON.stringify(contactPersons, null, 2) + "</>");
`;
  const [allContactPersons, setAllContactPersons] = useState<
    string[] | undefined
  >(undefined);
  useEffect(() => {
    if (!jobRunnerClient) return;
    const runScript = async () => {
      try {
        const response = await jobRunnerClient.executeScript(script);
        const i1 = response.indexOf("<>");
        const i2 = response.lastIndexOf("</>");
        if (i1 === -1 || i2 === -1 || i2 <= i1) {
          console.error("Invalid response format:", response);
          return;
        }
        const jsonString = response.substring(i1 + 2, i2);
        const contactPersons = JSON.parse(jsonString);
        if (!Array.isArray(contactPersons)) {
          console.error("Parsed response is not an array:", contactPersons);
          return;
        }
        setAllContactPersons(contactPersons);
      } catch (error) {
        console.error("Error executing script:", error);
      }
    };
    runScript();
  }, [jobRunnerClient, script]);
  return { allContactPersons };
};

const useSearch = (
  jobRunnerClient: JobRunnerClient | undefined,
  filter: Filter,
) => {
  const [dandisetIds, setDandisetIds] = useState<string[]>([]);
  useEffect(() => {
    if (!filter.contactPerson || !jobRunnerClient) {
      setDandisetIds([]);
      return;
    }
    const script = `
const dandisets = await interface.getDandisets();
const filteredDandisets = dandisets.filter(dandiset => dandiset.contact_person === "${filter.contactPerson}");
if (filteredDandisets.length > 0) {
  filteredDandisets.forEach(dandiset => {
    interface.print(\`DANDISET: \${dandiset.dandiset_id}\`);
  });
} else {
  interface.print("No dandisets found with contact person Baker, Cody.");
}
  `;
    const runScript = async () => {
      try {
        const response = await jobRunnerClient.executeScript(script);
        const lines = response
          .split("\n")
          .filter((line) => line.startsWith("DANDISET: "));
        const ids = lines.map((line) => line.replace("DANDISET: ", "").trim());
        setDandisetIds(ids);
      } catch (error) {
        console.error("Error executing search script:", error);
      }
    };
    runScript();
  }, [filter.contactPerson, jobRunnerClient]);
  return {
    dandisetIds,
  };
};
