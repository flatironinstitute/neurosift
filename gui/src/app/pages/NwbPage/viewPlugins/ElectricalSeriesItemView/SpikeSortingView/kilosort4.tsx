import { FunctionComponent, useEffect, useMemo, useState } from "react";
import { getJobOutputUrl, useJob } from "../../CEBRA/PairioHelpers";
import {
  PairioJob,
  PairioJobDefinition,
  PairioJobRequiredResources,
} from "app/pairio/types";

type SpikeSortingKilosort4Opts = {
  // none
};

const defaultSpikeSortingKilosort4Opts: SpikeSortingKilosort4Opts = {
  // none
};

export const spikeSortingKilosort4ParameterNames = [];

export const useSpikeSortingKilosort4Step = (prepareEphysJob?: PairioJob) => {
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

  const spikeSortingKilosort4RequiredResources: PairioJobRequiredResources =
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

  const spikeSortingKilosort4JobDefinition: PairioJobDefinition | undefined =
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
          { name: "output_units_name", value: "units_kilosort4" },
        ],
      };
    }, [prepareEphysJob, prepareEphysOutputElectricalSeriesPath]);

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
          {/* <tr>
              <td>Detect threshold:</td>
              <td>
                <InputChoices
                  value={spikeSortingOpts.detect_threshold}
                  choices={[5, 6, 7, 8]}
                  onChange={(detectThreshold) =>
                    setSpikeSortingOpts({
                      ...spikeSortingOpts,
                      detect_threshold: detectThreshold as number,
                    })
                  }
                />
              </td>
            </tr> */}
        </tbody>
      </table>
    </div>
  );
};
