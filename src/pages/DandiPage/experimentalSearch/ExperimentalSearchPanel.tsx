import { FunctionComponent, useEffect, useState, useMemo } from "react";
import { JobRunnerClient } from "./jobRunnerClient";

type ExperimentalSearchPanelProps = {
  setDandisetIds?: (ids: string[]) => void;
};

type DandisetInfo = {
  id: string;
  contactPerson: string;
  species: string[];
};

type ContactPersonWithSpecies = {
  name: string;
  species: string[];
  count: number;
};

type SearchData = {
  contactPersons: ContactPersonWithSpecies[];
  dandisetInfo: DandisetInfo[];
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
  const { searchData } = useSearchData(jobRunnerClient);
  const dandisetIds = useFilteredDandisets(searchData, filter);

  const availableContactPersons = useMemo(() => {
    if (!searchData) return [];
    if (filter.species === "<not specified>") {
      return searchData.contactPersons;
    }

    // When a species is selected, show only contact persons who have that species
    return searchData.contactPersons
      .filter((person) => person.species.includes(filter.species))
      .map((person) => ({
        ...person,
        count: 1, // Since we know they have this species
      }));
  }, [searchData, filter.species]);

  const availableSpecies = useMemo(() => {
    if (!searchData) return [];
    if (filter.contactPerson === "<not specified>") {
      // When no contact person is selected, show all unique species
      const allSpecies = new Set<string>();
      searchData.contactPersons.forEach((person) => {
        person.species.forEach((species) => allSpecies.add(species));
      });
      return Array.from(allSpecies)
        .sort()
        .map((name) => ({
          name,
          count: searchData.contactPersons.reduce(
            (acc, person) => acc + (person.species.includes(name) ? 1 : 0),
            0
          ),
        }));
    }

    // When a contact person is selected, show only their species
    const person = searchData.contactPersons.find(
      (p) => p.name === filter.contactPerson
    );
    if (!person) return [];

    return person.species.sort().map((name) => ({
      name,
      count: 1,
    }));
  }, [searchData, filter.contactPerson]);

  // Clear selections if they become unavailable
  useEffect(() => {
    // Clear species if not available for current contact person
    if (filter.species !== "<not specified>" && availableSpecies.length > 0) {
      const isSpeciesAvailable = availableSpecies.some(
        (s) => s.name === filter.species
      );
      if (!isSpeciesAvailable) {
        setFilter((f) => ({ ...f, species: "<not specified>" }));
      }
    }

    // Clear contact person if not available for current species
    if (filter.contactPerson !== "<not specified>" && availableContactPersons.length > 0) {
      const isPersonAvailable = availableContactPersons.some(
        (p) => p.name === filter.contactPerson
      );
      if (!isPersonAvailable) {
        setFilter((f) => ({ ...f, contactPerson: "<not specified>" }));
      }
    }
  }, [filter.species, filter.contactPerson, availableSpecies, availableContactPersons]);

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
  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <strong>Experimental Search Under Construction</strong>
      </div>
      {searchData && (
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
            {availableContactPersons.map((person) => (
              <option key={person.name} value={person.name}>
                {person.name} ({person.count} dandiset
                {person.count !== 1 ? "s" : ""})
              </option>
            ))}
          </select>
        </div>
      )}
      {searchData && (
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
            {availableSpecies.map((species) => (
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

const useSearchData = (jobRunnerClient: JobRunnerClient | undefined) => {
  const script = `
const dandisets = await interface.getDandisets();
const contactPersonToSpecies = {};
const dandisetInfo = [];

for (const dandiset of dandisets) {
  const person = dandiset.contact_person;
  const speciesInDandiset = new Set();

  for (const nwbFile of dandiset.nwbFiles) {
    if (nwbFile.subject && nwbFile.subject.species) {
      speciesInDandiset.add(nwbFile.subject.species);
    }
  }

  if (!contactPersonToSpecies[person]) {
    contactPersonToSpecies[person] = {
      name: person,
      species: new Set(),
      count: 0
    };
  }

  for (const species of speciesInDandiset) {
    contactPersonToSpecies[person].species.add(species);
  }
  contactPersonToSpecies[person].count++;

  // Add dandiset info
  dandisetInfo.push({
    id: dandiset.dandiset_id,
    contactPerson: person,
    species: Array.from(speciesInDandiset)
  });
}

// Convert to desired format
const result = {
  contactPersons: Object.values(contactPersonToSpecies)
    .map(({name, species, count}) => ({
      name,
      species: Array.from(species),
      count
    }))
    .sort((a, b) => a.name.localeCompare(b.name)),
  dandisetInfo: dandisetInfo
};

interface.print("<>" + JSON.stringify(result, null, 2) + "</>");
`;

  const [searchData, setSearchData] = useState<SearchData | undefined>(undefined);

  useEffect(() => {
    if (!jobRunnerClient) return;
    const runScript = async () => {
      try {
        console.info("Submitting script to job runner:");
        console.info(script);
        const response = await jobRunnerClient.executeScript(script);
        console.info({ response });
        const i1 = response.indexOf("<>");
        const i2 = response.lastIndexOf("</>");
        if (i1 === -1 || i2 === -1 || i2 <= i1) {
          console.error("Invalid response format:", response);
          return;
        }
        const jsonString = response.substring(i1 + 2, i2);
        const data = JSON.parse(jsonString);
        setSearchData(data);
      } catch (error) {
        console.error("Error executing script:", error);
      }
    };
    runScript();
  }, [jobRunnerClient, script]);

  return { searchData };
};

const useFilteredDandisets = (searchData: SearchData | undefined, filter: Filter) => {
  return useMemo(() => {
    if (!searchData) return [];

    // If no filters are set, return empty array
    if (filter.contactPerson === "<not specified>" && filter.species === "<not specified>") {
      return [];
    }

    return searchData.dandisetInfo
      .filter(info => {
        // Filter by contact person
        if (filter.contactPerson !== "<not specified>" && info.contactPerson !== filter.contactPerson) {
          return false;
        }

        // Filter by species
        if (filter.species !== "<not specified>" && !info.species.includes(filter.species)) {
          return false;
        }

        return true;
      })
      .map(info => info.id);
  }, [searchData, filter.contactPerson, filter.species]);
};
