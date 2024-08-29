import { FunctionComponent } from "react";
import InputChoices from "./InputChoices";

export type SpikeSortingMountainSort5Opts = {
  detect_threshold: number;
  channel_radius: number;
  output_units_name: string;
};

export const defaultSpikeSortingMountainSort5Opts: SpikeSortingMountainSort5Opts =
  {
    detect_threshold: 4.5,
    channel_radius: 100,
    output_units_name: "units_mountainsort5",
  };

export const spikeSortingMountainSort5ParameterNames = [
  "detect_threshold",
  "channel_radius",
  "output_units_name",
];

type SelectSpikeSortingOptsProps = {
  spikeSortingOpts: SpikeSortingMountainSort5Opts;
  setSpikeSortingOpts: (opts: SpikeSortingMountainSort5Opts) => void;
};

export const SelectSpikeSortingMountainSort5Opts: FunctionComponent<
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
                choices={[4, 4.5, 5, 5.5, 6, 7, 8]}
                onChange={(detectThreshold) =>
                  setSpikeSortingOpts({
                    ...spikeSortingOpts,
                    detect_threshold: detectThreshold as number,
                  })
                }
              />
            </td>
          </tr>
          <tr>
            <td>Channel radius:</td>
            <td>
              <InputChoices
                value={spikeSortingOpts.channel_radius}
                choices={[10, 50, 100, 200, 500, 1000, 5000]}
                onChange={(channelRadius) =>
                  setSpikeSortingOpts({
                    ...spikeSortingOpts,
                    channel_radius: channelRadius as number,
                  })
                }
              />
            </td>
          </tr>
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
