import { AccordionItem, Button, DescriptionList } from "@ui";
import { FunctionComponent, ReactNode, useState } from "react";
import type { SpecificationsNamespace } from "./SetupNwbFileSpecificationsProvider";
import {
  joined,
  ownParts,
  schemaSources,
  type OwnPart,
  type SchemaType,
} from "./schemaTypes";

function Section({
  title,
  summary,
  initiallyOpen = true,
  children,
}: {
  title: string;
  summary?: string;
  initiallyOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(initiallyOpen);
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

const Header = ({ name, line }: { name: string; line: string }) => (
  <header className="reference-details-header">
    <h2 className="reference-details-name">{name}</h2>
    <p className="reference-details-path">{line}</p>
  </header>
);

function Parts({ title, parts }: { title: string; parts: OwnPart[] }) {
  if (parts.length === 0) return null;
  return (
    <Section title={title} summary={`${parts.length} of its own`}>
      <ul className="reference-parts">
        {parts.map((part, index) => (
          <li key={`${part.name}-${index}`}>
            <code className="reference-part-name">{part.name}</code>
            {part.doc && <span className="reference-part-doc">{part.doc}</span>}
          </li>
        ))}
      </ul>
    </Section>
  );
}

const AsStored = ({ value }: { value: unknown }) => (
  <Section title="As stored" initiallyOpen={false}>
    <pre className="reference-value">{JSON.stringify(value, null, 2)}</pre>
  </Section>
);

type TypeProps = {
  type: SchemaType;
  chain: string[];
  /** Paths of objects of this type, or undefined while the file is read. */
  paths?: string[];
  onOpenPath: (path: string) => void;
};

/** A type: what it is, what it builds on, what it adds and where the file uses it. */
export const TypeDetails: FunctionComponent<TypeProps> = ({
  type,
  chain,
  paths,
  onOpenPath,
}) => {
  const own = ownParts(type.spec);
  const { dtype, dims, shape, default_name: defaultName } = type.spec;
  const shapeFacts = [
    ...(defaultName
      ? [{ term: "Default name", value: String(defaultName) }]
      : []),
    ...(dtype !== undefined
      ? [{ term: "dtype", value: JSON.stringify(dtype) }]
      : []),
    ...(dims !== undefined
      ? [{ term: "dims", value: JSON.stringify(dims) }]
      : []),
    ...(shape !== undefined
      ? [{ term: "shape", value: JSON.stringify(shape) }]
      : []),
  ];
  return (
    <div className="reference-details-body">
      <Header
        name={type.name || "Unnamed type"}
        line={[
          type.namespace,
          type.kind.toLowerCase(),
          type.extends && `extends ${type.extends}`,
        ]
          .filter(Boolean)
          .join(" · ")}
      />
      {type.doc && (
        <Section title="Description">
          <p className="reference-text">{type.doc}</p>
        </Section>
      )}
      {chain.length > 0 && (
        <Section
          title="Inherits from"
          summary={`${chain.length} type${chain.length === 1 ? "" : "s"}`}
        >
          <p className="reference-value">{chain.join(" → ")}</p>
        </Section>
      )}
      {shapeFacts.length > 0 && (
        <Section title="Shape and name">
          <DescriptionList
            label="Shape and name"
            layout="code"
            items={shapeFacts}
          />
        </Section>
      )}
      <Parts title="Datasets" parts={own.datasets} />
      <Parts title="Groups" parts={own.groups} />
      <Parts title="Attributes" parts={own.attributes} />
      <Section
        title="In this file"
        summary={
          paths
            ? `${paths.length} object${paths.length === 1 ? "" : "s"}`
            : undefined
        }
      >
        {!paths ? (
          <p className="reference-note">Reading the file…</p>
        ) : paths.length === 0 ? (
          <p className="reference-note">Not used in this file.</p>
        ) : (
          <ul className="reference-paths">
            {paths.map((path) => (
              <li key={path}>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onOpenPath(path)}
                >
                  {path}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <AsStored value={type.spec} />
    </div>
  );
};

/** A namespace: its description, people and schema files. */
export const NamespaceDetails: FunctionComponent<{
  namespace: SpecificationsNamespace;
}> = ({ namespace: ns }) => (
  <div className="reference-details-body">
    <Header name={ns.name} line={`namespace · ${ns.version}`} />
    <Section title="Description">
      <p className="reference-text">{ns.doc}</p>
    </Section>
    <Section title="People">
      <DescriptionList
        label="People"
        layout="code"
        items={[
          { term: "Full name", value: ns.full_name },
          { term: "Authors", value: joined(ns.author) },
          { term: "Contact", value: joined(ns.contact) },
        ]}
      />
    </Section>
    <Section title="Schema" summary={String(schemaSources(ns).length)}>
      <p className="reference-value">{schemaSources(ns).join("\n")}</p>
    </Section>
    <AsStored value={ns} />
  </div>
);
