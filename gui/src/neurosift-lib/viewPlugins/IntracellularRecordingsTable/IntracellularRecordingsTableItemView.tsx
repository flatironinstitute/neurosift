/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useEffect, useState } from "react";
import { useNwbFile } from "../../misc/NwbFileContext";
import { ReferenceComponent } from "../DynamicTable/DynamicTableView";

type Props = {
  width: number;
  height: number;
  path: string;
  condensed?: boolean;
};

const IntracellularRecordingsTableItemView: FunctionComponent<Props> = ({
  width,
  height,
  path,
  condensed,
}) => {
  const nwbFile = useNwbFile();
  const [rows, setRows] = useState<
    | {
        id: number;
        electrode: any;
        stimulus: any;
        response: any;
      }[]
    | undefined
  >(undefined);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined,
  );
  useEffect(() => {
    setRows(undefined);
    if (!nwbFile) {
      setErrorMessage("No NWB file");
      return;
    }
    (async () => {
      try {
        const ids = await nwbFile.getDatasetData(`${path}/id`, {});
        if (!ids) {
          throw Error(`No ids found at path ${path}/id`);
        }
        const electrodesIds = await nwbFile.getDatasetData(
          `${path}/electrodes/id`,
          {},
        );
        if (!electrodesIds) {
          throw Error(`No electrode ids found at path ${path}/electrodes/id`);
        }
        const electrodesData = await nwbFile.getDatasetData(
          `${path}/electrodes/electrode`,
          {},
        );
        if (!electrodesData) {
          throw Error(
            `No electrode data found at path ${path}/electrodes/electrode`,
          );
        }
        const stimuliIds = await nwbFile.getDatasetData(
          `${path}/stimuli/id`,
          {},
        );
        if (!stimuliIds) {
          throw Error(`No stimulus ids found at path ${path}/stimuli/id`);
        }
        const stimuliData = await nwbFile.getDatasetData(
          `${path}/stimuli/stimulus`,
          {},
        );
        if (!stimuliData) {
          throw Error(
            `No stimulus data found at path ${path}/stimuli/stimulus`,
          );
        }
        const responsesIds = await nwbFile.getDatasetData(
          `${path}/responses/id`,
          {},
        );
        if (!responsesIds) {
          throw Error(`No response ids found at path ${path}/responses/id`);
        }
        const responsesData = await nwbFile.getDatasetData(
          `${path}/responses/response`,
          {},
        );
        if (!responsesData) {
          throw Error(
            `No response data found at path ${path}/responses/response`,
          );
        }
        const rows = Array.from(ids).map((id: number) => {
          const electrodesIndex = electrodesIds.indexOf(id);
          const stimuliIndex = stimuliIds.indexOf(id);
          const responsesIndex = responsesIds.indexOf(id);
          return {
            id,
            electrode:
              electrodesIndex === -1
                ? undefined
                : electrodesData[electrodesIndex],
            stimulus:
              stimuliIndex === -1 ? undefined : stimuliData[stimuliIndex],
            response:
              responsesIndex === -1 ? undefined : responsesData[responsesIndex],
          };
        });
        setRows(rows);
      } catch (error: any) {
        console.error(error);
        setErrorMessage(error.message);
      }
    })();
  }, [nwbFile, path]);
  if (!rows) {
    if (errorMessage) {
      return <div>{errorMessage}</div>;
    } else {
      return <div>Loading...</div>;
    }
  }
  return (
    <table className="nwb-table">
      <thead>
        <tr>
          <th>id</th>
          <th>electrode</th>
          <th>stimulus</th>
          <th>response</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>{row.id}</td>
            <td>
              <ItemView item={row.electrode} />
            </td>
            <td>
              <ItemView item={row.stimulus} />
            </td>
            <td>
              <ItemView item={row.response} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const ItemView: FunctionComponent<{ item: any }> = ({ item }) => {
  if (item === null) {
    return <span>null</span>;
  }
  if (item === undefined) {
    return <span>undefined</span>;
  }
  if (typeof item !== "object") {
    return <span>{item}</span>;
  }
  if (item._REFERENCE) {
    return <ReferenceComponent value={item._REFERENCE} />;
  }
  if (Array.isArray(item)) {
    return (
      <span>
        {item.map((x: any, i: number) => {
          if (i > 0) {
            return (
              <span key={i}>
                , <ItemView item={x} />
              </span>
            );
          } else {
            return <ItemView key={i} item={x} />;
          }
        })}
      </span>
    );
  }
  return <pre>{JSON.stringify(item, null, 2)}</pre>;
};

// the spec:
// {
//     "groups": [
//       {
//         "doc": "Table for storing intracellular electrode related metadata.",
//         "name": "electrodes",
//         "neurodata_type_inc": "IntracellularElectrodesTable"
//       },
//       {
//         "doc": "Table for storing intracellular stimulus related metadata.",
//         "name": "stimuli",
//         "neurodata_type_inc": "IntracellularStimuliTable"
//       },
//       {
//         "doc": "Table for storing intracellular response related metadata.",
//         "name": "responses",
//         "neurodata_type_inc": "IntracellularResponsesTable"
//       }
//     ],
//     "doc": "A table to group together a stimulus and response from a single electrode and a single simultaneous recording. Each row in the table represents a single recording consisting typically of a stimulus and a corresponding response. In some cases, however, only a stimulus or a response is recorded as part of an experiment. In this case, both the stimulus and response will point to the same TimeSeries while the idx_start and count of the invalid column will be set to -1, thus, indicating that no values have been recorded for the stimulus or response, respectively. Note, a recording MUST contain at least a stimulus or a response. Typically the stimulus and response are PatchClampSeries. However, the use of AD/DA channels that are not associated to an electrode is also common in intracellular electrophysiology, in which case other TimeSeries may be used.",
//     "name": "intracellular_recordings",
//     "neurodata_type_inc": "AlignedDynamicTable",
//     "neurodata_type_def": "IntracellularRecordingsTable",
//     "attributes": [
//       {
//         "doc": "Description of the contents of this table. Inherited from AlignedDynamicTable and overwritten here to fix the value of the attribute.",
//         "name": "description",
//         "dtype": "text",
//         "value": "A table to group together a stimulus and response from a single electrode and a single simultaneous recording and for storing metadata about the intracellular recording."
//       }
//     ]
//   }

export default IntracellularRecordingsTableItemView;
