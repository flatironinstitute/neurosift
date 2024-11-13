import { FunctionComponent } from "react";

export type SpikeSortingKilosort4Opts = {
  output_units_name: string;
};

export const defaultSpikeSortingKilosort4Opts: SpikeSortingKilosort4Opts = {
  output_units_name: "units_kilosort4",
};

export const spikeSortingKilosort4ParameterNames = ["output_units_name"];

type SelectSpikeSortingOptsProps = {
  spikeSortingOpts: SpikeSortingKilosort4Opts;
  setSpikeSortingOpts: (opts: SpikeSortingKilosort4Opts) => void;
};

export const SelectSpikeSortingKilosort4Opts: FunctionComponent<
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
