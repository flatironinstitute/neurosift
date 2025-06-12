/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs';
import { fetchDandisetsFromApi } from './dandi';

// interface FetchDandisetsParams {
//   search?: string;
// }

export interface ScriptInterface {
  print: (text: string) => void;
  _getOutput: () => string;
  getDandisets: () => Promise<DandisetInfo[]>;
  findDandisets: (o: {search: string}) => Promise<DandisetInfo[]>;
  getDandiset: (o: {dandisetId: string}) => Promise<DandisetInfo | undefined>;
}

class DandiInterface {
  constructor(public o: {onStatusUpdate: (status: string) => void}) {
    this.o.onStatusUpdate('Dandi Interface initialized');
  }
  async getDandiset(o: {dandisetId: string}): Promise<DandiInterfaceDandiset | undefined> {
    this.o.onStatusUpdate(`Getting dandiset: ${o.dandisetId}`);
    const fname = '../data/dandi.json';
    if (!fs.existsSync(fname)) {
      throw new Error(`Dandiset data file not found: ${fname}`);
    }
    const fileContent = fs.readFileSync(fname, 'utf8');
    let data: {dandisets: DandisetInfo[]};
    try {
      data = JSON.parse(fileContent);
    } catch (error) {
      throw new Error(`Failed to parse JSON from ${fname}: ${error}`);
    }
    const ds = data.dandisets.find(d => d.dandiset_id === o.dandisetId);
    if (!ds) return undefined;
    return new DandiInterfaceDandiset(
      this,
      ds.dandiset_id,
      ds.version,
      ds.name,
      ds.created,
      ds.modified,
      ds.asset_count,
      ds.size,
      ds.contact_person,
      ds.embargo_status,
      ds.star_count
    );
  }
  async getDandisets(): Promise<DandiInterfaceDandiset[]> {
    this.o.onStatusUpdate('Getting dandisets...');
    const fname = '../data/dandi.json';
    if (!fs.existsSync(fname)) {
      throw new Error(`Dandiset data file not found: ${fname}`);
    }
    const fileContent = fs.readFileSync(fname, 'utf8');
    let data: {dandisets: DandisetInfo[]};
    try {
      data = JSON.parse(fileContent);
    } catch (error) {
      throw new Error(`Failed to parse JSON from ${fname}: ${error}`);
    }
    return data.dandisets.map(ds => new DandiInterfaceDandiset(
      this,
      ds.dandiset_id,
      ds.version,
      ds.name,
      ds.created,
      ds.modified,
      ds.asset_count,
      ds.size,
      ds.contact_person,
      ds.embargo_status,
      ds.star_count
    ));
  }
  async findDandisets(o: {search?: string, /*semanticSearch?: string, */restrictToDandisets?: string[]}): Promise<DandiInterfaceDandiset[]> {
    if (o.search) {
      // if (o.semanticSearch) {
      //   throw new Error('Cannot use both search and semanticSearch at the same time');
      // }
      if (o.restrictToDandisets) {
        throw new Error('Cannot use restrictToDandisets with search');
      }
      this.o.onStatusUpdate(`Searching dandisets for: ${o.search}`);
      const result = await fetchDandisetsFromApi(o.search);
      return result.map(ds => new DandiInterfaceDandiset(
        this,
        ds.dandiset_id,
        ds.version,
        ds.name,
        ds.created,
        ds.modified,
        ds.asset_count,
        ds.size,
        ds.contact_person,
        ds.embargo_status,
        ds.star_count
      ));
    }
    // else if (o.semanticSearch) {
    //   this.o.onStatusUpdate(`Performing semantic search for: ${o.semanticSearch}`);
    //   const dandisetIds = await doDandisetSemanticSearch(o.semanticSearch, o.restrictToDandisets);
    //   const result: DandiInterfaceDandiset[] = [];
    //   for (const dandisetId of dandisetIds) {
    //     const dandiset = await this.getDandiset({dandisetId});
    //     if (dandiset) {
    //       result.push(dandiset);
    //     }
    //   }
    //   return result;
    // }
    else {
      // throw new Error('Either search or semanticSearch must be provided');
      throw new Error('No search criteria provided');
    }
  }
}

type DandisetMetadata = {
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
    roleName?: string[];
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
}

class DandiInterfaceDandiset {
  constructor(
    public dandiInterface: DandiInterface,
    public dandiset_id: string,
    public version: string,
    public name: string,
    public created: string,
    public modified: string,
    public asset_count: number,
    public size: number,
    public contact_person: string,
    public embargo_status: string,
    public star_count: number
  ) {
  }
  async getNwbFiles(): Promise<DandiInterfaceNwbFile[]> {
    const dandisetFname = `../data/dandisets/${this.dandiset_id}/dandiset.json`;
    if (!fs.existsSync(dandisetFname)) {
      throw new Error(`Dandiset file not found: ${dandisetFname}`);
    }
    const fileContent = fs.readFileSync(dandisetFname, 'utf8');
    let dandisetData: {
      dandiset_id: string;
      version: string;
      name: string;
      created: string;
      modified: string;
      asset_count: number;
      size: number;
      contact_person: string;
      embargo_status: string;
      star_count: number;
      nwb_files: {path: string, size: number, asset_id: string}[];
      metadata: DandisetMetadata
    };
    try {
      dandisetData = JSON.parse(fileContent);
    }
    catch (error) {
      throw new Error(`Failed to parse JSON from ${dandisetFname}: ${error}`);
    }
    if (dandisetData.dandiset_id !== this.dandiset_id || dandisetData.version !== this.version) {
      console.warn(`Dandiset ID or version mismatch: expected ${this.dandiset_id}/${this.version}, got ${dandisetData.dandiset_id}/${dandisetData.version}`);
      return [];
    }
    return dandisetData.nwb_files.map(nwb => new DandiInterfaceNwbFile(
      this.dandiInterface,
      this.dandiset_id,
      this.version,
      nwb.path,
      nwb.size,
      nwb.asset_id
    ));
  }
  async getDandisetMetadata(): Promise<DandisetMetadata> {
    const dandisetFname = `../data/dandisets/${this.dandiset_id}/dandiset.json`;
    if (!fs.existsSync(dandisetFname)) {
      throw new Error(`Dandiset metadata file not found: ${dandisetFname}`);
    }
    const fileContent = fs.readFileSync(dandisetFname, 'utf8');
    let dandisetData: {
      dandiset_id: string;
      version: string;
      name: string;
      created: string;
      modified: string;
      asset_count: number;
      size: number;
      contact_person: string;
      embargo_status: string;
      star_count: number;
      metadata: DandisetMetadata
    };
    try {
      dandisetData = JSON.parse(fileContent);
    } catch (error) {
      throw new Error(`Failed to parse JSON from ${dandisetFname}: ${error}`);
    }
    const ret = dandisetData.metadata;
    // intentionally hide some of the assetsSummary fields so we don't bias the AI classifications
    ret.assetsSummary.species = [];
    ret.assetsSummary.approach = [];
    ret.assetsSummary.dataStandard = [];
    ret.assetsSummary.measurementTechnique = [];
    ret.assetsSummary.variableMeasured = [];
    return ret;
  }
}

class DandiInterfaceNwbFile {
  constructor(
    public dandiInterface: DandiInterface,
    public dandiset_id: string,
    public version: string,
    public path: string,
    public size: number,
    public asset_id: string
  ) {
  }
  getNeurodataObjects = async (): Promise<DandiInterfaceNeurodataObject[]> => {
    const fname = `../data/dandisets/${this.dandiset_id}/assets.v7/${this.asset_id}.json`;
    if (!fs.existsSync(fname)) {
      // maybe it wasn't created yet
      return [];
    }
    const fileContent = fs.readFileSync(fname, 'utf8');
    let assetData: {
      dandiset_id: string;
      asset_id: string;
      neurodata_objects: {
        path: string;
        type: string;
        description: string;
      }[];
    }
    try {
      assetData = JSON.parse(fileContent);
    } catch (error) {
      throw new Error(`Failed to parse JSON from ${fname}: ${error}`);
    }
    if (assetData.dandiset_id !== this.dandiset_id || assetData.asset_id !== this.asset_id) {
      throw new Error(`Asset ID or dandiset ID mismatch: expected ${this.dandiset_id}/${this.asset_id}, got ${assetData.dandiset_id}/${assetData.asset_id}`);
    }
    return assetData.neurodata_objects.map(no => new DandiInterfaceNeurodataObject({
      dandisetId: this.dandiset_id,
      version: this.version,
      assetId: this.asset_id,
      path: no.path,
      neurodataType: no.type,
      description: no.description
    }));
  }
}

class DandiInterfaceNeurodataObject {
  constructor(
    private o: {
      dandisetId: string,
      version: string,
      assetId: string,
      neurodataType: string,
      path: string,
      description: string
    }
  ) {
  }
  get dandisetId() {
    return this.o.dandisetId;
  }
  get version() {
    return this.o.version;
  }
  get assetId() {
    return this.o.assetId;
  }
  get neurodataType() {
    return this.o.neurodataType;
  }
  get path() {
    return this.o.path;
  }
  get description() {
    return this.o.description;
  }
}

export function createScriptInterface(onStatusUpdate: (status: string) => void): ScriptInterface {
  let outputBuffer = "";
  const dandiInterface = new DandiInterface({onStatusUpdate});

  return {
    print: (text: string | any) => {
      let v = "";
      if (typeof text === 'string') {
        v = text;
      }
      else {
        try {
          v = JSON.stringify(text, null, 2);
        } catch (e) {
          v = `Error stringifying object: ${e}`;
        }
      }
      outputBuffer += v + "\n";
      onStatusUpdate(text);
    },
    _getOutput: () => outputBuffer,
    getDandisets: async () => {
      return await dandiInterface.getDandisets();
    },
    findDandisets: async (o: {search?: string, /*semanticSearch?: string*/}) => {
      return await dandiInterface.findDandisets(o);
    },
    getDandiset: async (o: {dandisetId: string}) => {
      return await dandiInterface.getDandiset(o);
    }
  };
}

export interface DandisetInfo {
  dandiset_id: string;
  version: string;
  name: string;
  created: string;
  modified: string;
  asset_count: number;
  size: number;
  contact_person: string;
  embargo_status: string;
  star_count: number;
}

// const doDandisetSemanticSearch = async (query: string, restrictToDandisets?: string[]): Promise<string[]> => {
//   const url = 'https://neurosift-chat-agent-tools.vercel.app/api/dandi_semantic_search';
//   const params: {[key: string]: any} = {
//     query,
//     limit: 20
//   }
//   if (restrictToDandisets && restrictToDandisets.length > 0) {
//     params['dandisets'] = restrictToDandisets;
//   }
//   // POST
//   const response = await fetch(url, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify(params)
//   });
//   if (!response.ok) {
//     throw new Error(`Failed to perform semantic search: ${response.statusText}`);
//   }
//   const data: any = await response.json();
//   if (!data) {
//     throw new Error('Semantic search returned no data');
//   }
//   if (typeof data !== 'object' || !Array.isArray(data.results)) {
//     throw new Error('Semantic search returned invalid data format');
//   }
//   return data.results.map((item: {id: string}) => item.id);
// };

