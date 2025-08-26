import { FunctionComponent, useEffect, useState, useMemo } from "react";
import { Chip, Stack } from "@mui/material";
import { JobRunnerClient } from "./jobRunnerClient";

type ExperimentalSearchPanelProps = {
  setDandisetIds?: (ids: string[]) => void;
};

type DandisetInfo = {
  id: string;
  contactPerson: string;
  species: string[];
  neurodataTypes: string[];
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
  neurodataTypes: string[];
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
    neurodataTypes: [],
  });
  const { searchData } = useSearchData(jobRunnerClient);
  const dandisetIds = useFilteredDandisets(searchData, filter);

  const availableContactPersons = useMemo(() => {
    if (!searchData) return [];

    // Filter dandisets based on current criteria
    const filteredDandisets = searchData.dandisetInfo.filter((info) => {
      if (
        filter.species !== "<not specified>" &&
        !info.species.includes(filter.species)
      ) {
        return false;
      }
      if (
        filter.neurodataTypes.length > 0 &&
        !filter.neurodataTypes.every((type) =>
          info.neurodataTypes.includes(type),
        )
      ) {
        return false;
      }
      return true;
    });

    // Get unique contact persons from filtered dandisets
    const contactPersonCounts = new Map<string, number>();
    filteredDandisets.forEach((info) => {
      contactPersonCounts.set(
        info.contactPerson,
        (contactPersonCounts.get(info.contactPerson) || 0) + 1,
      );
    });

    // Map to required format
    return Array.from(contactPersonCounts.entries())
      .map(([name, count]) => ({
        name,
        species:
          searchData.contactPersons.find((p) => p.name === name)?.species || [],
        count,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [searchData, filter.species, filter.neurodataTypes]);

  const availableNeurodataTypes = useMemo(() => {
    if (!searchData) return [];

    // Filter dandisets based on current criteria except the neurodataTypes we're currently selecting
    const filteredDandisets = searchData.dandisetInfo.filter((info) => {
      if (
        filter.contactPerson !== "<not specified>" &&
        info.contactPerson !== filter.contactPerson
      ) {
        return false;
      }
      if (
        filter.species !== "<not specified>" &&
        !info.species.includes(filter.species)
      ) {
        return false;
      }
      // Only consider existing neurodata type selections
      if (filter.neurodataTypes.length > 0) {
        // A dandiset must have all currently selected types to be considered
        const hasAllSelectedTypes = filter.neurodataTypes.every(
          (selectedType) => info.neurodataTypes.includes(selectedType),
        );
        if (!hasAllSelectedTypes) {
          return false;
        }
      }
      return true;
    });

    // Get all unique neurodata types from filtered dandisets
    const allTypes = new Set<string>();
    filteredDandisets.forEach((dandiset) => {
      dandiset.neurodataTypes.forEach((type) => allTypes.add(type));
    });

    return Array.from(allTypes)
      .sort()
      .map((name) => ({
        name,
        count: filteredDandisets.reduce(
          (acc, dandiset) =>
            acc + (dandiset.neurodataTypes.includes(name) ? 1 : 0),
          0,
        ),
      }));
  }, [searchData, filter.contactPerson, filter.species, filter.neurodataTypes]);

  const availableSpecies = useMemo(() => {
    if (!searchData) return [];

    // Filter dandisets based on current criteria
    const filteredDandisets = searchData.dandisetInfo.filter((info) => {
      if (
        filter.contactPerson !== "<not specified>" &&
        info.contactPerson !== filter.contactPerson
      ) {
        return false;
      }
      if (
        filter.neurodataTypes.length > 0 &&
        !filter.neurodataTypes.every((type) =>
          info.neurodataTypes.includes(type),
        )
      ) {
        return false;
      }
      return true;
    });

    // Get unique species from filtered dandisets
    const speciesCounts = new Map<string, number>();
    filteredDandisets.forEach((info) => {
      info.species.forEach((species) => {
        speciesCounts.set(species, (speciesCounts.get(species) || 0) + 1);
      });
    });

    return Array.from(speciesCounts.entries())
      .map(([name, count]) => ({
        name,
        count,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [searchData, filter.contactPerson, filter.neurodataTypes]);

  // Clear selections if they become unavailable
  useEffect(() => {
    // Clear species if not available for current contact person
    if (filter.species !== "<not specified>" && availableSpecies.length > 0) {
      const isSpeciesAvailable = availableSpecies.some(
        (s) => s.name === filter.species,
      );
      if (!isSpeciesAvailable) {
        setFilter((f) => ({ ...f, species: "<not specified>" }));
      }
    }

    // Clear contact person if not available for current species
    if (
      filter.contactPerson !== "<not specified>" &&
      availableContactPersons.length > 0
    ) {
      const isPersonAvailable = availableContactPersons.some(
        (p) => p.name === filter.contactPerson,
      );
      if (!isPersonAvailable) {
        setFilter((f) => ({ ...f, contactPerson: "<not specified>" }));
      }
    }

    // Clear neurodata types that are no longer available
    if (
      filter.neurodataTypes.length > 0 &&
      availableNeurodataTypes.length > 0
    ) {
      const availableTypes = new Set(
        availableNeurodataTypes.map((t) => t.name),
      );
      const unavailableTypes = filter.neurodataTypes.filter(
        (t) => !availableTypes.has(t),
      );
      if (unavailableTypes.length > 0) {
        setFilter((f) => ({
          ...f,
          neurodataTypes: f.neurodataTypes.filter((t) => availableTypes.has(t)),
        }));
      }
    }
  }, [
    filter.species,
    filter.contactPerson,
    filter.neurodataTypes,
    availableSpecies,
    availableContactPersons,
    availableNeurodataTypes,
  ]);

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
      {searchData && (
        <div style={{ marginTop: 20 }}>
          <div style={{ marginBottom: 10 }}>Neurodata Types:</div>
          <Stack
            direction="row"
            spacing={1}
            sx={{ flexWrap: "wrap", gap: 1, mb: 2 }}
          >
            {filter.neurodataTypes.map((type) => (
              <Chip
                key={type}
                label={type}
                onDelete={() =>
                  setFilter((f) => ({
                    ...f,
                    neurodataTypes: f.neurodataTypes.filter((t) => t !== type),
                  }))
                }
              />
            ))}
          </Stack>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                setFilter((f) => ({
                  ...f,
                  neurodataTypes: [...f.neurodataTypes, e.target.value],
                }));
                e.target.value = ""; // Reset select after adding
              }
            }}
            style={{ width: 400, height: 30 }}
          >
            <option value="">Add neurodata type...</option>
            {availableNeurodataTypes
              .filter((type) => !filter.neurodataTypes.includes(type.name))
              .map((type) => (
                <option key={type.name} value={type.name}>
                  {type.name} ({type.count} dandiset
                  {type.count !== 1 ? "s" : ""})
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
  const neurodataTypesInDandiset = new Set();

  for (const nwbFile of dandiset.nwbFiles) {
    if (nwbFile.subject && nwbFile.subject.species) {
      speciesInDandiset.add(nwbFile.subject.species);
    }
    if (nwbFile.neurodataObjects) {
      for (const obj of nwbFile.neurodataObjects) {
          if (obj.neurodataType) {
            neurodataTypesInDandiset.add(obj.neurodataType);
        }
      }
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
    species: Array.from(speciesInDandiset),
    neurodataTypes: Array.from(neurodataTypesInDandiset)
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

  const [searchData, setSearchData] = useState<SearchData | undefined>(
    undefined,
  );

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

const useFilteredDandisets = (
  searchData: SearchData | undefined,
  filter: Filter,
) => {
  return useMemo(() => {
    if (!searchData) return [];

    // If no filters are set, return empty array
    if (
      filter.contactPerson === "<not specified>" &&
      filter.species === "<not specified>" &&
      filter.neurodataTypes.length === 0
    ) {
      return [];
    }

    return searchData.dandisetInfo
      .filter((info) => {
        // Filter by contact person
        if (
          filter.contactPerson !== "<not specified>" &&
          info.contactPerson !== filter.contactPerson
        ) {
          return false;
        }

        // Filter by species
        if (
          filter.species !== "<not specified>" &&
          !info.species.includes(filter.species)
        ) {
          return false;
        }

        // Filter by neurodata types - must have all selected types
        if (
          filter.neurodataTypes.length > 0 &&
          !filter.neurodataTypes.every((type) =>
            info.neurodataTypes.includes(type),
          )
        ) {
          return false;
        }

        return true;
      })
      .map((info) => info.id);
  }, [searchData, filter.contactPerson, filter.species, filter.neurodataTypes]);
};
