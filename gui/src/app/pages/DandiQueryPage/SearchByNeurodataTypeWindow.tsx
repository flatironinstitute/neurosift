/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useEffect, useMemo, useState } from "react";
import useRoute from "../../useRoute";
import pako from "pako";
import NeurodataTypesSelector from "./NeurodataTypesSelector";
import { Hyperlink } from "@fi-sci/misc";
import JsonPathQueryComponent from "./JsonPathQueryComponent";
import Splitter from "app/Splitter/Splitter";

type SearchByNeurodataTypeWindowProps = {
  width: number;
  height: number;
};

const SearchByNeurodataTypeWindow: FunctionComponent<
  SearchByNeurodataTypeWindowProps
> = ({ width, height }) => {
  const [selectedDandisetIdVersions, setSelectedDandisetIdVersions] = useState<
    string[]
  >([]);
  const doSplit = selectedDandisetIdVersions.length > 0;
  const X = (
    <SearchByNeurodataTypeWindowChild
      width={0}
      height={0}
      selectedDandisetIdVersions={selectedDandisetIdVersions}
      setSelectedDandisetIdVersions={setSelectedDandisetIdVersions}
    />
  );
  return (
    <Splitter
      direction="vertical"
      width={width}
      height={height}
      initialPosition={height / 2}
      hideSecondChild={!doSplit}
    >
      {X}
      <JsonPathQueryComponent
        width={0}
        height={0}
        dandisetIdVersions={selectedDandisetIdVersions}
      />
    </Splitter>
  );
};

type SearchByNeurodataTypeWindowChildProps = {
  width: number;
  height: number;
  selectedDandisetIdVersions: string[];
  setSelectedDandisetIdVersions: (dandisetIds: string[]) => void;
};

const SearchByNeurodataTypeWindowChild: FunctionComponent<
  SearchByNeurodataTypeWindowChildProps
> = ({
  width,
  height,
  selectedDandisetIdVersions,
  setSelectedDandisetIdVersions,
}) => {
  const { route } = useRoute();
  if (route.page !== "dandi-query")
    throw new Error("route.page !== dandi-query");

  const neurodataTypesIndex = useNeurodataTypesIndex();

  const { allNeurodataTypes } = useMemo(() => {
    if (!neurodataTypesIndex) return { allNeurodataTypes: [] };
    const allNeurodataTypes = new Set<string>();
    for (const file of neurodataTypesIndex.files) {
      for (const neurodataType of file.neurodata_types) {
        allNeurodataTypes.add(neurodataType);
      }
    }
    return { allNeurodataTypes: Array.from(allNeurodataTypes).sort() };
  }, [neurodataTypesIndex]);

  const [selectedNeurodataTypes, setSelectedNeurodataTypes] = useState<
    string[]
  >([]);

  const results: Results | undefined = useMemo(() => {
    if (!allNeurodataTypes || !neurodataTypesIndex) return undefined;
    if (selectedNeurodataTypes.length === 0) return undefined;
    const results: Results = {
      matchingDandisets: [],
    };
    for (const file of neurodataTypesIndex.files) {
      if (
        selectedNeurodataTypes.every((selectedNeurodataType) =>
          file.neurodata_types.includes(selectedNeurodataType),
        )
      ) {
        const dandisetId = file.dandiset_id;
        if (
          results.matchingDandisets.some((x) => x.dandisetId === dandisetId)
        ) {
          const matchingDandiset = results.matchingDandisets.find(
            (x) => x.dandisetId === dandisetId,
          );
          if (!matchingDandiset) throw new Error("Unexpected");
          matchingDandiset.numMatchingAssets++;
          matchingDandiset.neurodataTypes = Array.from(
            new Set([
              ...matchingDandiset.neurodataTypes,
              ...file.neurodata_types,
            ]),
          ).sort();
        } else {
          results.matchingDandisets.push({
            dandisetId,
            dandisetVersion: file.dandiset_version,
            numMatchingAssets: 1,
            neurodataTypes: file.neurodata_types,
          });
        }
      }
    }
    // sort by dandiset id alphabetical
    results.matchingDandisets.sort((a, b) =>
      a.dandisetId.localeCompare(b.dandisetId),
    );
    return results;
  }, [neurodataTypesIndex, selectedNeurodataTypes, allNeurodataTypes]);

  useEffect(() => {
    const newSelectedDandisetIdVersions = selectedDandisetIdVersions.filter(
      (dandisetIdVersion) =>
        results?.matchingDandisets.some(
          (x) => x.dandisetId === dandisetIdVersion.split("@")[0],
        ),
    );
    if (
      newSelectedDandisetIdVersions.length !== selectedDandisetIdVersions.length
    ) {
      setSelectedDandisetIdVersions(newSelectedDandisetIdVersions);
    }
  }, [selectedDandisetIdVersions, results, setSelectedDandisetIdVersions]);

  if (route.staging) {
    return <div>Staging not currently supported for dandi query</div>;
  }
  return (
    <div
      style={{
        position: "absolute",
        left: 10,
        top: 10,
        width: width - 20,
        height: height - 20,
        overflowY: "auto",
      }}
    >
      <div>
        <p style={{ color: "darkred" }}>
          Only the first 100 assets of each Dandiset are included in the query.
          Results may not reflect recent updates to Dandisets.
        </p>
        <NeurodataTypesSelector
          allNeurodataTypes={allNeurodataTypes}
          selectedNeurodataTypes={selectedNeurodataTypes}
          setSelectedNeurodataTypes={setSelectedNeurodataTypes}
        />
        <ResultsView
          results={results}
          selectedDandisetIdVersions={selectedDandisetIdVersions}
          setSelectedDandisetIdVersions={setSelectedDandisetIdVersions}
        />
      </div>
    </div>
  );
};

type Results = {
  matchingDandisets: {
    dandisetId: string;
    dandisetVersion: string;
    numMatchingAssets: number;
    neurodataTypes: string[];
  }[];
};

type ResultsViewProps = {
  results: Results | undefined;
  selectedDandisetIdVersions: string[];
  setSelectedDandisetIdVersions: (dandisetIdVersions: string[]) => void;
};

const ResultsView: FunctionComponent<ResultsViewProps> = ({
  results,
  selectedDandisetIdVersions,
  setSelectedDandisetIdVersions,
}) => {
  const { setRoute, route } = useRoute();
  const selectedDandisetIds = useMemo(
    () => selectedDandisetIdVersions.map((x) => x.split("@")[0]),
    [selectedDandisetIdVersions],
  );
  if (!results) return null;
  return (
    <table className="nwb-table">
      <thead>
        <tr>
          <th>
            <Checkbox
              checked={
                selectedDandisetIds.length === results.matchingDandisets.length
              }
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedDandisetIdVersions(
                    results.matchingDandisets.map(
                      (x) => x.dandisetId + "@" + x.dandisetVersion,
                    ),
                  );
                } else {
                  setSelectedDandisetIdVersions([]);
                }
              }}
            />
          </th>
          <th>Dandiset ID</th>
          <th>Number of Matching NWB Files</th>
          <th>Neurodata types</th>
        </tr>
      </thead>
      <tbody>
        {results.matchingDandisets.map((matchingDandiset) => (
          <tr key={matchingDandiset.dandisetId}>
            <td>
              <Checkbox
                checked={selectedDandisetIds.includes(
                  matchingDandiset.dandisetId,
                )}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedDandisetIdVersions([
                      ...selectedDandisetIdVersions,
                      matchingDandiset.dandisetId +
                        "@" +
                        matchingDandiset.dandisetVersion,
                    ]);
                  } else {
                    setSelectedDandisetIdVersions(
                      selectedDandisetIdVersions.filter(
                        (x) => x.split("@")[0] !== matchingDandiset.dandisetId,
                      ),
                    );
                  }
                }}
              />
            </td>
            <td>
              <Hyperlink
                onClick={() => {
                  setRoute({
                    page: "dandiset",
                    dandisetId: matchingDandiset.dandisetId,
                    staging: (route as any)["staging"] || false,
                  });
                }}
              >
                {matchingDandiset.dandisetId}
              </Hyperlink>
            </td>
            <td>{matchingDandiset.numMatchingAssets}</td>
            <td>{matchingDandiset.neurodataTypes.join(", ")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const useNeurodataTypesIndex = () => {
  const [data, setData] = useState<NeurodataTypesIndex | undefined>(undefined);
  useEffect(() => {
    let canceled = false;
    (async () => {
      const x = await fetchNeurodataTypesIndex();
      if (canceled) return;
      setData(x);
    })();
    return () => {
      canceled = true;
    };
  }, []);
  return data;
};

export type NeurodataTypesIndex = {
  files: {
    dandiset_id: string;
    dandiset_version: string;
    asset_id: string;
    asset_path: string;
    neurodata_types: string[];
  }[];
};

let cachedNeurodataTypesIndex: NeurodataTypesIndex | undefined = undefined;
export const fetchNeurodataTypesIndex = async () => {
  if (cachedNeurodataTypesIndex) return cachedNeurodataTypesIndex;
  try {
    const url =
      "https://lindi.neurosift.org/dandi/neurodata_types_index.json.gz";
    const response = await fetch(url + "?cb=" + Date.now());
    const bufferGz = await response.arrayBuffer();
    const buffer = pako.inflate(bufferGz);
    const text = new TextDecoder().decode(buffer);
    const json = JSON.parse(text);
    cachedNeurodataTypesIndex = json;
    return cachedNeurodataTypesIndex;
  } catch (err) {
    console.error(err);
    return undefined;
  }
};

type CheckboxProps = {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

const Checkbox: FunctionComponent<CheckboxProps> = ({ checked, onChange }) => {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      style={{ cursor: "pointer" }}
    />
  );
};

export default SearchByNeurodataTypeWindow;
