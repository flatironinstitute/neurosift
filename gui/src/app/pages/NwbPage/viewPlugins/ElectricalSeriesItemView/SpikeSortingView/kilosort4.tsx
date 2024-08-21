import { FunctionComponent, useEffect, useMemo, useState } from "react";
import { getJobOutputUrl, useJob } from "../../CEBRA/DendroHelpers";
import {
  DendroJob,
  DendroJobDefinition,
  DendroJobRequiredResources,
} from "app/dendro/dendro-types";

type SpikeSortingKilosort4Opts = {
  output_units_name: string;
};

const defaultSpikeSortingKilosort4Opts: SpikeSortingKilosort4Opts = {
  output_units_name: "units_kilosort4",
};

export const spikeSortingKilosort4ParameterNames = ["output_units_name"];

export const useSpikeSortingKilosort4Step = (prepareEphysJob?: DendroJob) => {
  const [spikeSortingKilosort4Opts, setSpikeSortingKilosort4Opts] =
    useState<SpikeSortingKilosort4Opts>(defaultSpikeSortingKilosort4Opts);

  const selectSpikeSortingKilosort4OptsComponent = (
    <SelectSpikeSortingKilosort4Opts
      spikeSortingOpts={spikeSortingKilosort4Opts}
      setSpikeSortingOpts={setSpikeSortingKilosort4Opts}
    />
  );

  const [spikeSortingKilosort4JobId, setSpikeSortingKilosort4JobId] = useState<
    string | undefined
  >(undefined);
  const {
    job: spikeSortingKilosort4Job,
    refreshJob: refreshSpikeSortingKilosort4Job,
  } = useJob(spikeSortingKilosort4JobId);

  const spikeSortingKilosort4RequiredResources: DendroJobRequiredResources =
    useMemo(() => {
      return {
        numCpus: 4,
        numGpus: 1,
        memoryGb: 16,
        timeSec: 60 * 60 * 3,
      };
    }, []);

  const prepareEphysOutputElectricalSeriesPath = useMemo(() => {
    if (!prepareEphysJob) {
      return undefined;
    }
    const pp = prepareEphysJob.jobDefinition.parameters.find(
      (p) => p.name === "output_electrical_series_name",
    );
    if (!pp) {
      return undefined;
    }
    return `acquisition/${pp.value as string}`;
  }, [prepareEphysJob]);

  const spikeSortingKilosort4JobDefinition: DendroJobDefinition | undefined =
    useMemo(() => {
      const inputFileUrl = getJobOutputUrl(prepareEphysJob, "output");
      if (!inputFileUrl) {
        return undefined;
      }
      if (!prepareEphysOutputElectricalSeriesPath) {
        return undefined;
      }
      return {
        appName: "hello_kilosort4",
        processorName: "kilosort4",
        inputFiles: [
          {
            name: "input",
            fileBaseName: "input.nwb.lindi.tar",
            url: inputFileUrl,
          },
        ],
        outputFiles: [
          {
            name: "output",
            fileBaseName: "output.nwb.lindi.tar",
          },
        ],
        parameters: [
          {
            name: "electrical_series_path",
            value: prepareEphysOutputElectricalSeriesPath,
          },
          {
            name: "output_units_name",
            value: spikeSortingKilosort4Opts.output_units_name,
          },
        ],
      };
    }, [
      prepareEphysJob,
      prepareEphysOutputElectricalSeriesPath,
      spikeSortingKilosort4Opts,
    ]);

  useEffect(() => {
    setSpikeSortingKilosort4JobId(undefined);
  }, [prepareEphysJob]);

  if (!prepareEphysJob) {
    return {
      selectSpikeSortingKilosort4OptsComponent: undefined,
      spikeSortingKilosort4JobId: undefined,
      setSpikeSortingKilosort4JobId: () => {},
      spikeSortingKilosort4Job: undefined,
      refreshSpikeSortingKilosort4Job: () => {},
      prepareEphysOutputNwbUrl: undefined,
      spikeSortingKilosort4RequiredResources: undefined,
      spikeSortingKilosort4JobDefinition: undefined,
    };
  }

  return {
    selectSpikeSortingKilosort4OptsComponent,
    spikeSortingKilosort4JobId,
    setSpikeSortingKilosort4JobId,
    spikeSortingKilosort4Job,
    refreshSpikeSortingKilosort4Job,
    spikeSortingKilosort4RequiredResources,
    spikeSortingKilosort4JobDefinition,
  };
};

type SelectSpikeSortingOptsProps = {
  spikeSortingOpts: SpikeSortingKilosort4Opts;
  setSpikeSortingOpts: (opts: SpikeSortingKilosort4Opts) => void;
};

const SelectSpikeSortingKilosort4Opts: FunctionComponent<
  SelectSpikeSortingOptsProps
> = ({ spikeSortingOpts, setSpikeSortingOpts }) => {
  return (
    <div>
      <table>
        <tbody>
          <tr>
            <td>Output units name:</td>
            <td>
              <input
                type="text"
                value={spikeSortingOpts.output_units_name}
                onChange={(e) =>
                  setSpikeSortingOpts({
                    ...spikeSortingOpts,
                    output_units_name: e.target.value,
                  })
                }
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
