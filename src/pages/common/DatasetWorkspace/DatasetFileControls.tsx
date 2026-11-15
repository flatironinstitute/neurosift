import { Button, Checkbox } from "@ui";
import { FunctionComponent } from "react";

type Props = {
  /** Shown when the list mixes NWB and other files, or isn't complete yet. */
  showNwbToggle: boolean;
  nwbOnly: boolean;
  onNwbOnlyChange: (nwbOnly: boolean) => void;
  /** Present while only part of the file list has loaded. */
  partial?: { loaded: number; total?: number; onLoadMore: () => void };
};

/** Above a dataset's files: the NWB-only filter and, for long lists, Load more files. */
const DatasetFileControls: FunctionComponent<Props> = ({
  showNwbToggle,
  nwbOnly,
  onNwbOnlyChange,
  partial,
}) => (
  <>
    {showNwbToggle && (
      <Checkbox
        label="Show NWB files only"
        checked={nwbOnly}
        onChange={onNwbOnlyChange}
      />
    )}
    {partial && (
      <>
        <span className="dataset-files-count">
          {`${partial.loaded.toLocaleString("en-US")} of ${
            partial.total ? partial.total.toLocaleString("en-US") : "?"
          } files`}
        </span>
        <Button size="sm" variant="secondary" onClick={partial.onLoadMore}>
          Load more files
        </Button>
      </>
    )}
  </>
);

export default DatasetFileControls;
