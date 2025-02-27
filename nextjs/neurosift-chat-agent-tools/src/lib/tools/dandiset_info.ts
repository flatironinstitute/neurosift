interface DandisetInfo {
  id: string;
  name: string;
  about: Array<{ schemaKey: string }>;
  access: Array<{ status: string; schemaKey: string }>;
  license: string[];
  version: string;
  citation: string;
  keywords: string[];
  protocol: unknown[];
  identifier: string;
  contributor: string[];
  dateCreated: string;
  description: string;
  numberOfBytes?: number;
  numberOfFiles?: number;
  numberOfSubjects?: number;
  variableMeasured?: string[];
  measurementTechnique?: Array<{
    name: string;
    schemaKey: string;
  }>;
}

export async function getDandisetInfo(
  dandisetId: string,
  version: string = "draft"
): Promise<DandisetInfo> {
  const url = `https://api.dandiarchive.org/api/dandisets/${dandisetId}/versions/${version}/`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`DANDI API error: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    id: data.id,
    name: data.name,
    about: data.about,
    access: data.access,
    license: data.license,
    version: data.version,
    citation: data.citation,
    keywords: data.keywords,
    protocol: data.protocol,
    identifier: data.identifier,
    contributor: data.contributor.map((c: { name: string }) => c.name),
    dateCreated: data.dateCreated,
    description: data.description,
    numberOfBytes: data.assetsSummary?.numberOfBytes,
    numberOfFiles: data.assetsSummary?.numberOfFiles,
    numberOfSubjects: data.assetsSummary?.numberOfSubjects,
    variableMeasured: data.assetsSummary?.variableMeasured,
    measurementTechnique: data.assetsSummary?.measurementTechnique
  };
}
