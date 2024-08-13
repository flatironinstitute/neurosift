import { FunctionComponent, useEffect, useMemo, useState } from "react";
import InputChoices from "./InputChoices";
import { getJobOutputUrl, useJob } from "../../CEBRA/PairioHelpers";
import { PairioJob, PairioJobDefinition, PairioJobRequiredResources } from "app/pairio/types";

type SpikeSortingMountainSort5Opts = {
  detect_threshold: number;
};

const defaultSpikeSortingMountainSort5Opts: SpikeSortingMountainSort5Opts = {
  detect_threshold: 5,
};

export const spikeSortingMountainSort5ParameterNames = ["detect_threshold"];

export const useSpikeSortingMountainSort5Step = (prepareEphysJob?: PairioJob) => {
    const [spikeSortingMountainSort5Opts, setSpikeSortingMountainSort5Opts] = useState<SpikeSortingMountainSort5Opts>(
      defaultSpikeSortingMountainSort5Opts,
    );

    const selectSpikeSortingMountainSort5OptsComponent = (
      <SelectSpikeSortingMountainSort5Opts
        spikeSortingOpts={spikeSortingMountainSort5Opts}
        setSpikeSortingOpts={setSpikeSortingMountainSort5Opts}
      />
    );

    const [spikeSortingMountainSort5JobId, setSpikeSortingMountainSort5JobId] = useState<
      string | undefined
    >(undefined);
    const { job: spikeSortingMountainSort5Job, refreshJob: refreshSpikeSortingMountainSort5Job } =
      useJob(spikeSortingMountainSort5JobId);

    const spikeSortingMountainSort5RequiredResources: PairioJobRequiredResources =
      useMemo(() => {
        return {
          numCpus: 4,
          numGpus: 0,
          memoryGb: 4,
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

    const spikeSortingMountainSort5JobDefinition: PairioJobDefinition | undefined =
      useMemo(() => {
        const inputFileUrl = getJobOutputUrl(prepareEphysJob, "output");
        if (!inputFileUrl) {
          return undefined;
        }
        if (!prepareEphysOutputElectricalSeriesPath) {
          return undefined;
        }
        return {
          appName: "hello_neurosift",
          processorName: "mountainsort5",
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
            { name: "output_units_name", value: "units_mountainsort5" },
            {
              name: "detect_threshold",
              value: spikeSortingMountainSort5Opts.detect_threshold,
            },
          ],
        };
      }, [
        prepareEphysJob,
        spikeSortingMountainSort5Opts,
        prepareEphysOutputElectricalSeriesPath,
      ]);

    useEffect(() => {
      setSpikeSortingMountainSort5JobId(undefined);
    }, [prepareEphysJob]);

    if (!prepareEphysJob) {
      return {
        selectSpikeSortingMountainSort5OptsComponent: undefined,
        spikeSortingMountainSort5JobId: undefined,
        setSpikeSortingMountainSort5JobId: () => {},
        spikeSortingMountainSort5Job: undefined,
        refreshSpikeSortingMountainSort5Job: () => {},
        prepareEphysOutputNwbUrl: undefined,
        spikeSortingMountainSort5RequiredResources: undefined,
        spikeSortingMountainSort5JobDefinition: undefined,
      };
    }

    return {
      selectSpikeSortingMountainSort5OptsComponent,
      spikeSortingMountainSort5JobId,
      setSpikeSortingMountainSort5JobId,
      spikeSortingMountainSort5Job,
      refreshSpikeSortingMountainSort5Job,
      spikeSortingMountainSort5RequiredResources,
      spikeSortingMountainSort5JobDefinition,
    };
  };

  type SelectSpikeSortingOptsProps = {
    spikeSortingOpts: SpikeSortingMountainSort5Opts;
    setSpikeSortingOpts: (opts: SpikeSortingMountainSort5Opts) => void;
  };

  const SelectSpikeSortingMountainSort5Opts: FunctionComponent<
    SelectSpikeSortingOptsProps
  > = ({ spikeSortingOpts, setSpikeSortingOpts }) => {
    return (
      <div>
        <table>
          <tbody>
            <tr>
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
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

