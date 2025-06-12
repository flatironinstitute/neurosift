import { FunctionComponent, useEffect, useState } from "react";
import { JobRunnerClient } from "./jobRunnerClient";

type ExperimentalSearchPanelProps = {
  setDandisetIds?: (ids: string[]) => void;
};

type Filter = {
  contactPerson: string | "<not specified>";
  species: string | "<not specified>";
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
    contactPerson: "<not specified>",
    species: "<not specified>",
  });
  const { allContactPersons } = useAllContactPersons(jobRunnerClient);
  const { allSpecies } = useAllSpecies(jobRunnerClient);
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
    return (
      <div>
        Waiting for job runner to initialize. This is an experimental feature
        and the job runner may be offline. Please check back later.
      </div>
    );
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
            value={filter.contactPerson || "<not specified>"}
            onChange={(e) =>
              setFilter({
                ...filter,
                contactPerson: e.target.value,
              })
            }
            style={{ width: 400, height: 30 }}
          >
            <option value="<not specified>">All contact persons</option>
            {allContactPersons.map((person) => (
              <option key={person.name} value={person.name}>
                {person.name} ({person.count} dandiset
                {person.count !== 1 ? "s" : ""})
              </option>
            ))}
          </select>
        </div>
      )}
      {allSpecies && (
        <div style={{ marginTop: 20 }}>
          <div style={{ marginBottom: 10 }}>Species:</div>
          <select
            value={filter.species || "<not specified>"}
            onChange={(e) =>
              setFilter({
                ...filter,
                species: e.target.value,
              })
            }
            style={{ width: 400, height: 30 }}
          >
            <option value="<not specified>">All species</option>
            {allSpecies.map((species) => (
              <option key={species.name} value={species.name}>
                {species.name} ({species.count} dandiset
                {species.count !== 1 ? "s" : ""})
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

type ContactPersonWithCount = {
  name: string;
  count: number;
};

const useAllContactPersons = (jobRunnerClient: JobRunnerClient | undefined) => {
  const script = `
const dandisets = await interface.getDandisets();
const contactPersonCounts = {};
for (const dandiset of dandisets) {
  const person = dandiset.contact_person;
  contactPersonCounts[person] = (contactPersonCounts[person] || 0) + 1;
}
// Convert to array of objects and sort by name
const result = Object.entries(contactPersonCounts)
  .map(([name, count]) => ({ name, count }))
  .sort((a, b) => a.name.localeCompare(b.name));
interface.print("<>" + JSON.stringify(result, null, 2) + "</>");
`;
  const [allContactPersons, setAllContactPersons] = useState<
    ContactPersonWithCount[] | undefined
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

const useAllSpecies = (jobRunnerClient: JobRunnerClient | undefined) => {
  type SpeciesWithCount = {
    name: string;
    count: number;
  };

  const script = `
const dandisets = await interface.getDandisets();
const speciesCounts = {};

// Track species per dandiset to avoid double-counting
for (const dandiset of dandisets) {
  const speciesInDandiset = new Set();
  for (const nwbFile of dandiset.nwbFiles) {
    if (nwbFile.subject && nwbFile.subject.species) {
      speciesInDandiset.add(nwbFile.subject.species);
    }
  }
  for (const species of speciesInDandiset) {
    speciesCounts[species] = (speciesCounts[species] || 0) + 1;
  }
}

const result = Object.entries(speciesCounts)
  .map(([name, count]) => ({ name, count }))
  .sort((a, b) => a.name.localeCompare(b.name));
interface.print("<>" + JSON.stringify(result, null, 2) + "</>");
`;
  const [allSpecies, setAllSpecies] = useState<SpeciesWithCount[] | undefined>(
    undefined,
  );

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
        const species = JSON.parse(jsonString);
        if (!Array.isArray(species)) {
          console.error("Parsed response is not an array:", species);
          return;
        }
        setAllSpecies(species);
      } catch (error) {
        console.error("Error executing script:", error);
      }
    };
    runScript();
  }, [jobRunnerClient, script]);
  return { allSpecies };
};

const useSearch = (
  jobRunnerClient: JobRunnerClient | undefined,
  filter: Filter,
) => {
  const [dandisetIds, setDandisetIds] = useState<string[]>([]);
  useEffect(() => {
    if (
      (filter.contactPerson === "<not specified>" &&
        filter.species === "<not specified>") ||
      !jobRunnerClient
    ) {
      setDandisetIds([]);
      return;
    }
    const script = `
const dandisets = await interface.getDandisets();
const filteredDandisets = dandisets.filter(dandiset => {
  if ("${filter.contactPerson}" !== "<not specified>" && dandiset.contact_person !== "${filter.contactPerson}") {
    return false;
  }
  if ("${filter.species}" !== "<not specified>") {
    const speciesInDandiset = new Set();
    for (const nwbFile of dandiset.nwbFiles) {
      if (nwbFile.subject && nwbFile.subject.species) {
        speciesInDandiset.add(nwbFile.subject.species);
      }
    }
    if (!speciesInDandiset.has("${filter.species}")) {
      return false;
    }
  }
  return true;
});

if (filteredDandisets.length > 0) {
  filteredDandisets.forEach(dandiset => {
    interface.print(\`DANDISET: \${dandiset.dandiset_id}\`);
  });
} else {
  interface.print("No matching dandisets found.");
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
  }, [filter.contactPerson, filter.species, jobRunnerClient]);
  return {
    dandisetIds,
  };
};
