/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  NwbFileSpecifications,
  SpecificationsNamespace,
} from "./SetupNwbFileSpecificationsProvider";

export type SchemaType = {
  name: string;
  extends?: string;
  kind: "Group" | "Dataset";
  namespace: string;
  doc: string;
  /** The type's entry as stored in the file. */
  spec: any;
};

// hdmf-common names its types with data_type_def rather than neurodata_type_def.
const defOf = (spec: any): string | undefined =>
  spec.neurodata_type_def ?? spec.data_type_def;
const incOf = (spec: any): string | undefined =>
  spec.neurodata_type_inc ?? spec.data_type_inc;

/** Every type the file's specifications define, with the namespace it comes from. */
export function schemaTypes(specs: NwbFileSpecifications): SchemaType[] {
  return specs.subgroups.flatMap((sg) =>
    sg.versions
      .flatMap((version) =>
        version.items.flatMap((item) => [
          ...(item.value.groups ?? []).map((spec) => ({
            spec,
            kind: "Group" as const,
          })),
          ...(item.value.datasets ?? []).map((spec) => ({
            spec,
            kind: "Dataset" as const,
          })),
        ]),
      )
      .map(({ spec, kind }) => ({
        name: defOf(spec) ?? "",
        extends: incOf(spec),
        kind,
        namespace: sg.name,
        doc: spec.doc ?? "",
        spec,
      })),
  );
}

/** The types a type builds on, the most general first. */
export function inheritance(types: SchemaType[], name: string): string[] {
  const byName = new Map(types.map((t) => [t.name, t]));
  const chain: string[] = [];
  let next = byName.get(name)?.extends;
  while (next && !chain.includes(next)) {
    chain.unshift(next);
    next = byName.get(next)?.extends;
  }
  return chain;
}

export type OwnPart = { name: string; doc?: string };

const partName = (part: any) =>
  part.name ?? incOf(part) ?? defOf(part) ?? "unnamed";

/** The datasets, groups and attributes a type adds itself. */
export function ownParts(spec: any): {
  datasets: OwnPart[];
  groups: OwnPart[];
  attributes: OwnPart[];
} {
  const list = (parts: any[] | undefined): OwnPart[] =>
    (parts ?? []).map((part) => ({ name: partName(part), doc: part.doc }));
  return {
    datasets: list(spec.datasets),
    groups: list(spec.groups),
    attributes: list(spec.attributes),
  };
}

export const joined = (value: string | string[]) =>
  typeof value === "string" ? value : value.join(", ");

export const schemaSources = (ns: SpecificationsNamespace) =>
  ns.schema
    .map((s) =>
      "namespace" in s ? s.namespace : "source" in s ? s.source : "",
    )
    .filter(Boolean);

export function matchesType(type: SchemaType, query: string): boolean {
  const q = query.trim().toLowerCase();
  return !q || type.name.toLowerCase().includes(q);
}

/** A description's first sentence, for a table cell; the details keep the rest. */
export function firstSentence(text: string): string {
  const match = /^.*?[.!?](?=\s|$)/s.exec(text.trim());
  return (match ? match[0] : text).trim();
}
