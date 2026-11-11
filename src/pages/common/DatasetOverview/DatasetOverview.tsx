import {
  Badge,
  Breadcrumbs,
  Button,
  DescriptionList,
  Disclosure,
  Select,
  Tag,
} from "@ui";
import { FunctionComponent, useState } from "react";
import "./DatasetOverview.css";

export type DatasetFact = { term: string; value: string; code?: boolean };

/** One titled block: long text, label-value pairs or tags. */
export type DatasetSection = {
  id: string;
  title: string;
  text?: string;
  /** What Show full … names, such as "description". */
  textName?: string;
  facts?: DatasetFact[];
  tags?: string[];
};

export type DatasetOverviewProps = {
  /** The archive the dataset comes from, which is also the way back. */
  archive: { name: string; href: string };
  /** What the archive calls one of its datasets, such as Dandiset. */
  itemName: string;
  id: string;
  title: string;
  version: string;
  versions?: { value: string; label: string }[];
  onVersionChange?: (version: string) => void;
  external: { label: string; href: string };
  facts: DatasetFact[];
  sections: DatasetSection[];
  chatHref?: string;
};

const PREVIEW = 600;

/** The text, cut after a long first stretch with the rest behind Show full …. */
function LongText({ text, what }: { text: string; what: string }) {
  const [open, setOpen] = useState(false);
  if (text.length <= PREVIEW) return <p className="dataset-text">{text}</p>;
  return (
    <div className="dataset-text">
      {!open && <p>{`${text.slice(0, PREVIEW).trimEnd()}…`}</p>}
      <Disclosure
        label={`Show full ${what}`}
        expandedLabel="Show less"
        open={open}
        onToggle={setOpen}
      >
        <p>{text}</p>
      </Disclosure>
    </div>
  );
}

/** What a dataset is, for any archive: where it's from, its version, facts and sections. */
const DatasetOverview: FunctionComponent<DatasetOverviewProps> = ({
  archive,
  itemName,
  id,
  title,
  version,
  versions,
  onVersionChange,
  external,
  facts,
  sections,
  chatHref,
}) => (
  <div className="dataset-overview">
    <Breadcrumbs
      items={[
        { label: archive.name, href: archive.href },
        { label: `${itemName} ${id}` },
      ]}
    />
    <header className="dataset-header">
      <p className="dataset-id">
        <Tag>{archive.name}</Tag>
        <span>{id}</span>
      </p>
      <h1 className="dataset-title">{title}</h1>
    </header>

    <div className="dataset-version">
      {versions && versions.length > 1 && onVersionChange ? (
        <Select
          label="Version"
          value={version}
          onChange={onVersionChange}
          options={versions}
        />
      ) : (
        <DescriptionList
          label="Version"
          layout="stacked"
          items={[{ term: "Version", value: version, code: true }]}
        />
      )}
      <Button
        variant="secondary"
        icon="launch"
        href={external.href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {external.label}
      </Button>
    </div>

    <DescriptionList label="Facts" layout="stacked" items={facts} />

    {sections.map((section) => (
      <section
        key={section.id}
        className="dataset-section"
        aria-labelledby={`dataset-${section.id}`}
      >
        <h2 id={`dataset-${section.id}`} className="dataset-section-title">
          {section.title}
        </h2>
        {section.text && (
          <LongText
            text={section.text}
            what={section.textName ?? section.title.toLowerCase()}
          />
        )}
        {section.facts && (
          <DescriptionList
            label={section.title}
            layout="stacked"
            items={section.facts}
          />
        )}
        {section.tags && (
          <p className="dataset-tags">
            {section.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </p>
        )}
      </section>
    ))}

    {chatHref && (
      <p className="dataset-chat">
        <a href={chatHref} target="_blank" rel="noopener noreferrer">
          Ask about this dataset in Chat
        </a>
        <Badge status="info">Experimental</Badge>
      </p>
    )}
  </div>
);

export default DatasetOverview;
