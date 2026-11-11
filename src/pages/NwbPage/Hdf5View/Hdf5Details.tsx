/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AccordionItem,
  Button,
  DataTable,
  DescriptionList,
  Disclosure,
  InlineMessage,
  useToast,
} from "@ui";
import { formatBytes } from "@shared/util/formatBytes";
import { FunctionComponent, useEffect, useState } from "react";
import {
  getHdf5DatasetData,
  type Hdf5Group,
  type Hdf5Subdataset,
} from "../hdf5Interface";
import {
  dtypeWords,
  datasetMeta,
  itemBytes,
  shapeText,
  valueCount,
  valueText,
} from "./hdf5Tree";

const SMALL = 10;
const ROWS = 10;
const COLUMNS = 20;
const LONG = 500;

const count = (n: number) => n.toLocaleString("en-US");

/** Text cut at 500 characters, with Show all. */
function LongValue({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  if (text.length <= LONG) return <>{text}</>;
  return (
    <>
      {!open && `${text.slice(0, LONG)}…`}
      <Disclosure
        label="Show all"
        expandedLabel="Show less"
        open={open}
        onToggle={setOpen}
      >
        {text}
      </Disclosure>
    </>
  );
}

function Section({
  title,
  summary,
  children,
}: {
  title: string;
  summary?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <AccordionItem
      title={title}
      summary={summary}
      open={open}
      onToggle={setOpen}
    >
      {children}
    </AccordionItem>
  );
}

function Attributes({ attrs }: { attrs: Record<string, any> }) {
  const names = Object.keys(attrs).sort();
  return (
    <Section title="Attributes" summary={count(names.length)}>
      {names.length === 0 ? (
        <p className="reference-note">No attributes.</p>
      ) : (
        <DescriptionList
          label="Attributes"
          layout="code"
          items={names.map((name) => ({
            term: name,
            value: <LongValue text={valueText(attrs[name])} />,
          }))}
        />
      )}
    </Section>
  );
}

type Rows = { status: "idle" | "reading" | "done" | "failed"; data?: any };

/** A dataset's values: small ones directly, large ones on request as a table of the first rows. */
function Values({
  nwbUrl,
  dataset,
}: {
  nwbUrl: string;
  dataset: Hdf5Subdataset;
}) {
  const n = valueCount(dataset.shape);
  const small = n <= SMALL;
  const [rows, setRows] = useState<Rows>({
    status: small ? "reading" : "idle",
  });

  useEffect(() => {
    if (!small) return;
    let canceled = false;
    getHdf5DatasetData(nwbUrl, dataset.path, {}).then(
      (data) => !canceled && setRows({ status: "done", data }),
      () => !canceled && setRows({ status: "failed" }),
    );
    return () => {
      canceled = true;
    };
  }, [nwbUrl, dataset.path, small]);

  const readRows = async () => {
    setRows({ status: "reading" });
    const slice: [number, number][] = [[0, Math.min(ROWS, dataset.shape[0])]];
    if (dataset.shape.length === 2)
      slice.push([0, Math.min(COLUMNS, dataset.shape[1])]);
    try {
      const data = await getHdf5DatasetData(nwbUrl, dataset.path, { slice });
      setRows({ status: "done", data });
    } catch {
      setRows({ status: "failed" });
    }
  };

  const bytes = itemBytes(dataset.dtype);
  let body: React.ReactNode;
  if (rows.status === "reading")
    body = (
      <p className="reference-note">
        {small ? "Reading the values…" : `Reading ${ROWS} rows…`}
      </p>
    );
  else if (rows.status === "failed")
    body = (
      <InlineMessage status="error">Couldn’t read these values.</InlineMessage>
    );
  else if (rows.status === "done" && small)
    body = (
      <p className="reference-value">
        <LongValue text={valueText(rows.data)} />
      </p>
    );
  else if (rows.status === "done")
    body = <FirstRows data={rows.data} dataset={dataset} />;
  else
    body = (
      <>
        <p className="reference-note">
          {`${count(n)} values${bytes ? `, about ${formatBytes(n * bytes)}` : ""}. Too many to show here; load a slice in Python, or show the first rows.`}
        </p>
        <Button size="sm" variant="ghost" onClick={readRows}>
          {`Show first ${ROWS} rows`}
        </Button>
      </>
    );

  return (
    <Section title="Values" summary={count(n)}>
      {body}
    </Section>
  );
}

function FirstRows({ data, dataset }: { data: any; dataset: Hdf5Subdataset }) {
  const flat = Array.from(data as ArrayLike<any>);
  const width =
    dataset.shape.length === 2 ? Math.min(COLUMNS, dataset.shape[1]) : 1;
  const rows = Array.from(
    { length: Math.ceil(flat.length / width) },
    (_, r) => ({
      index: r,
      values: flat.slice(r * width, r * width + width),
    }),
  );
  const shown = dataset.shape.length === 2 && dataset.shape[1] > COLUMNS;
  return (
    <>
      <DataTable
        caption={`First ${rows.length} rows of ${dataset.name}`}
        density="compact"
        rowKey={(row) => String(row.index)}
        rows={rows}
        columns={[
          { key: "row", label: "Row", type: "code", value: (row) => row.index },
          ...Array.from({ length: width }, (_, c) => ({
            key: `c${c}`,
            label: width === 1 ? "Value" : String(c),
            type: "code" as const,
            value: (row: { values: any[] }) => valueText(row.values[c]),
          })),
        ]}
      />
      {shown && (
        <p className="reference-note">{`The first ${COLUMNS} of ${count(dataset.shape[1])} columns.`}</p>
      )}
    </>
  );
}

type Props = {
  nwbUrl: string;
  path: string;
  group?: Hdf5Group;
  dataset?: Hdf5Subdataset;
};

/** What the selected group or dataset is: its facts, attributes and, for a dataset, values. */
const Hdf5Details: FunctionComponent<Props> = ({
  nwbUrl,
  path,
  group,
  dataset,
}) => {
  const toast = useToast();
  const name =
    path === "/" ? "File root" : path.slice(path.lastIndexOf("/") + 1);
  const copyPath = () =>
    navigator.clipboard.writeText(path).then(
      () => toast.show({ status: "success", message: "Path copied" }),
      () =>
        toast.show({
          status: "error",
          message: "Couldn’t copy. Your browser blocked it.",
        }),
    );

  return (
    <div className="reference-details-body">
      <header className="reference-details-header">
        <h2 className="reference-details-name">{name}</h2>
        <p className="reference-details-path">{path}</p>
        <div className="reference-details-actions">
          <Button size="sm" onClick={copyPath}>
            Copy path
          </Button>
        </div>
      </header>
      {dataset && (
        <>
          <Section title="Dataset" summary={datasetMeta(dataset)}>
            <DescriptionList
              label="Dataset"
              layout="code"
              items={[
                {
                  term: "Type",
                  value: [dataset.dtype, dtypeWords(dataset.dtype)]
                    .filter(Boolean)
                    .join(" · "),
                },
                { term: "Shape", value: shapeText(dataset.shape) },
                ...(dataset.chunks
                  ? [{ term: "Chunks", value: shapeText(dataset.chunks) }]
                  : []),
                ...(dataset.compressor
                  ? [{ term: "Compression", value: dataset.compressor }]
                  : []),
                ...(dataset.filters?.length
                  ? [{ term: "Filters", value: dataset.filters.join(", ") }]
                  : []),
              ]}
            />
          </Section>
          <Attributes attrs={dataset.attrs} />
          <Values key={dataset.path} nwbUrl={nwbUrl} dataset={dataset} />
        </>
      )}
      {group && (
        <>
          <Section title="Group">
            {group.subgroups.length + group.datasets.length === 0 ? (
              <p className="reference-note">
                This group has no datasets or groups.
              </p>
            ) : (
              <DescriptionList
                label="Group"
                layout="code"
                items={[
                  ...(group.attrs.neurodata_type
                    ? [
                        {
                          term: "Type",
                          value: String(group.attrs.neurodata_type),
                        },
                      ]
                    : []),
                  { term: "Groups", value: count(group.subgroups.length) },
                  { term: "Datasets", value: count(group.datasets.length) },
                ]}
              />
            )}
          </Section>
          <Attributes attrs={group.attrs} />
        </>
      )}
      {!group && !dataset && (
        <p className="reference-note">Reading this group…</p>
      )}
    </div>
  );
};

export default Hdf5Details;
