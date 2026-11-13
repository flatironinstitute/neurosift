import { Button, DescriptionList, IconButton, type Description } from "@ui";
import { FunctionComponent } from "react";
import { getHdf5DatasetData, type Hdf5Subdataset } from "../../hdf5Interface";
import { shapeText, valueCount, valueText } from "../../Hdf5View/hdf5Tree";

/** Datasets up to this many values show them; larger ones print to the console on request. */
export const VALUE_LIMIT = 100;

type Props = {
  name: string;
  path: string;
  attrs: Record<string, unknown>;
  dataset?: { dtype: string; shape: number[] } & Partial<Hdf5Subdataset>;
  value?: unknown;
  nwbUrl?: string;
  /** Leave out the name and path where the tab already shows them. */
  titled?: boolean;
  onOpenInNewTab?: () => void;
};

const printToConsole = async (nwbUrl: string, path: string) => {
  console.info("Loading dataset data for " + path);
  const data = await getHdf5DatasetData(nwbUrl, path, {});
  console.info(`Dataset data for ${path}:`);
  console.info(data);
};

/** A group or dataset: its name, Open in a new tab, its type and shape, its value and its attributes. */
const ObjectDetails: FunctionComponent<Props> = ({
  name,
  path,
  attrs,
  dataset,
  value,
  nwbUrl,
  titled = true,
  onOpenInNewTab,
}) => {
  const n = dataset ? valueCount(dataset.shape) : 0;
  const facts: Description[] = dataset
    ? [
        { term: "Type", value: dataset.dtype },
        { term: "Shape", value: n === 0 ? "Empty" : shapeText(dataset.shape) },
        ...(n > 0 && n <= VALUE_LIMIT
          ? [
              {
                term: "Value",
                value: value === undefined ? "Reading…" : valueText(value),
              },
            ]
          : []),
      ]
    : [];
  const attributes = Object.entries(attrs).map(
    ([term, v]): Description => ({ term, value: valueText(v) }),
  );

  return (
    <div className="default-view-object">
      {titled && (
        <header className="default-view-header">
          <div className="default-view-title">
            <h3 className="default-view-name">{name}</h3>
            <p className="default-view-path">{path}</p>
          </div>
          {onOpenInNewTab && (
            <IconButton
              icon="launch"
              label="Open in a new tab"
              size="sm"
              variant="ghost"
              onClick={onOpenInNewTab}
            />
          )}
        </header>
      )}
      {facts.length > 0 && (
        <DescriptionList
          label={`${name} dataset`}
          layout="code"
          items={facts}
        />
      )}
      {n > VALUE_LIMIT && nwbUrl && (
        <div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void printToConsole(nwbUrl, path)}
          >
            Print the values to the browser console
          </Button>
        </div>
      )}
      {attributes.length > 0 && (
        <DescriptionList
          label={`${name} attributes`}
          layout="code"
          items={attributes}
        />
      )}
    </div>
  );
};

export default ObjectDetails;
