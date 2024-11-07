/* eslint-disable @typescript-eslint/no-explicit-any */
export type DandisetSearchResultItem = {
  identifier: string;
  created: string;
  modified: string;
  contact_person: string;
  embargo_status: string;
  most_recent_published_version?: {
    version: string;
    name: string;
    asset_count: number;
    size: number;
    status: string;
    created: string;
    modified: string;
  };
  draft_version?: {
    version: string;
    name: string;
    asset_count: number;
    size: number;
    status: string;
    created: string;
    modified: string;
  };
};

export type DandisetsResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: DandisetSearchResultItem[];
};

export type AssetsResponseItem = {
  asset_id: string;
  blob: string;
  created: string;
  modified: string;
  path: string;
  size: number;
  zarr: any;
};

export type AssetsResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: AssetsResponseItem[];
};

export type AssetResponse = {
  access: {
    status: string;
    schemaKey: string;
  }[];
  approach: {
    name: string;
    schemaKey: string;
  }[];
  keywords: string[];
  schemaKey: string;
  dateModified: string;
  schemaVersion: string;
  encodingFormat: string;
  wasGeneratedBy: {
    name: string;
    schemaKey: string;
    startDate: string;
    identifier: string;
    description: string;
  }[];
  wasAttributedTo: any; // Co-pilot AI didn't help me with this one because there was a nested "sex" field
  blobDateModified: string;
  variableMeasured: {
    value: string;
    schemaKey: string;
  }[];
  measurementTechnique: {
    name: string;
    schemaKey: string;
  }[];
  id: string;
  path: string;
  identifier: string;
  contentUrl: string[];
  contentSize: number;
  digest: {
    [key: string]: string;
  };
  "@context": string;
};

export type DandisetVersionInfo = {
  version: string;
  name: string;
  asset_count: number;
  size: number;
  status: string;
  created: string;
  modified: string;
  dandiset: {
    identifier: string;
    created: string;
    modified: string;
    contact_person: string;
    embargo_status: string;
  };
  asset_validation_errors: any[];
  version_validation_errors: any[];
  metadata: {
    id: string;
    url: string;
    name: string;
    about: any[];
    access: {
      status: string;
      schemaKey: string;
    }[];
    license: string[];
    version: string;
    "@context": string;
    citation: string;
    keywords: string[];
    protocol: any[];
    schemaKey: string;
    identifier: string;
    repository: string;
    contributor: {
      name: string;
      email: string;
      roleName: string[];
      schemaKey: string;
      affiliation: any[];
      includeInCitation: boolean;
    }[];
    dateCreated: string;
    description: string;
    studyTarget: any[];
    assetsSummary: {
      species: {
        name: string;
        schemaKey: string;
        identifier: string;
      }[];
      approach: {
        name: string;
        schemaKey: string;
      }[];
      schemaKey: string;
      dataStandard: {
        name: string;
        schemaKey: string;
        identifier: string;
      }[];
      numberOfBytes: number;
      numberOfFiles: number;
      numberOfSubjects: number;
      variableMeasured: string[];
      measurementTechnique: {
        name: string;
        schemaKey: string;
      }[];
    };
    schemaVersion: string;
    ethicsApproval: any[];
    wasGeneratedBy: any[];
    relatedResource: {
      url: string;
      name: string;
      relation: string;
      schemaKey: string;
      identifier: string;
    }[];
    manifestLocation: string[];
  };
  contact_person: string;
};
