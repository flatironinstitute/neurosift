/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs';
import { fetchDandisetsFromApi } from './dandi';
import OpenAI from "openai";
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// interface FetchDandisetsParams {
//   search?: string;
// }

export interface ScriptInterface {
  print: (text: string) => void;
  _getOutput: () => string;
  getDandisets: () => Promise<DandisetInfo[]>;
  findDandisets: (o: {search: string}) => Promise<DandisetInfo[]>;
  getDandiset: (o: {dandisetId: string}) => Promise<DandisetInfo | undefined>;
  semanticSortDandisets: (dandisets: DandisetInfo[], query: string) => Promise<DandisetInfo[]>;
  getOpenNeuroDatasets: () => Promise<OpenNeuroDatasetInfo[]>;
  getOpenNeuroDataset: (o: {datasetId: string}) => Promise<OpenNeuroDatasetInfo | undefined>;
  semanticSortOpenNeuroDatasets: (datasets: OpenNeuroDatasetInfo[], query: string) => Promise<OpenNeuroDatasetInfo[]>;
}

// const _findDandisets = async (o: {search?: string}): Promise<DandisetInfo[]> => {
//   const params: FetchDandisetsParams = {};
//   if (o.search) {
//     params.search = o.search;
//   }
//   const vvv = '11';
//   const r = await getCachedResult<DandisetInfo[]>(
//     'findDandisets',
//     vvv,
//     [params.search || ''],
//     60 // Cache for 60 minutes
//   )
//   if (r) return r;
//   const result = await fetchDandisetsFromApi(params.search || '');
//   await setCachedResult('findDandisets', vvv, [params.search || ''], result);
//   return result;
// }

// const _findNwbFiles = async (o: {dandisetId: string, version: string}): Promise<NwbFileInfo[]> => {
//   const vvv = '11';
//   const r = await getCachedResult<NwbFileInfo[]>(
//     'findNwbFiles',
//     vvv,
//     [o.dandisetId, o.version],
//     o.version !== 'draft' ? 60 * 24 * 100 : 60 // Cache for 100 days if not draft, otherwise 60 minutes
//   );
//   if (r) return r;
//   const result = await fetchNwbFilesFromApi(o.dandisetId, o.version);
//   await setCachedResult('findNwbFiles', vvv, [o.dandisetId, o.version], result);
//   return result;
// }o: {search?: string}

class DandiInterface {
  constructor(public o: {onStatusUpdate: (status: string) => void}) {
    this.o.onStatusUpdate('Dandi Interface initialized');
  }
  async getDandiset(o: {dandisetId: string}): Promise<DandiInterfaceDandiset | undefined> {
    this.o.onStatusUpdate(`Getting dandiset: ${o.dandisetId}`);
    const fname = `${dandiBaseDir}/dandi.json`;
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
    const fname = `${dandiBaseDir}/dandi.json`;
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
  async findDandisets(o: {search?: string, semanticSearch?: string, restrictToDandisets?: string[]}): Promise<DandiInterfaceDandiset[]> {
    if (o.search) {
      if (o.semanticSearch) {
        throw new Error('Cannot use both search and semanticSearch at the same time');
      }
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
    else if (o.semanticSearch) {
      this.o.onStatusUpdate(`Performing semantic search for: ${o.semanticSearch}`);
      const dandisetIds = await doDandisetSemanticSearch(o.semanticSearch, o.restrictToDandisets);
      const result: DandiInterfaceDandiset[] = [];
      for (const dandisetId of dandisetIds) {
        const dandiset = await this.getDandiset({dandisetId});
        if (dandiset) {
          result.push(dandiset);
        }
      }
      return result;
    }
    else {
      throw new Error('Either search or semanticSearch must be provided');
    }
  }
  async semanticSortDandisets(dandisets: DandisetInfo[], query: string): Promise<DandisetInfo[]> {
    if (!query) {
      throw new Error('Query must be provided for semantic sorting');
    }
    const embedding = await computeSemanticEmbedding(query);
    if (!embedding) {
      throw new Error('Failed to compute semantic embedding for query');
    }
    const cosineSimilarities: number[] = [];
    for (const ds of dandisets) {
      const dandisetId = ds.dandiset_id;
      const embeddings2 = getEmbeddingsForDandiset(dandisetId);
      if (embeddings2) {
        // Compute cosine similarity
        let maxCosineSimilarity = 0;
        for (const embedding2 of embeddings2) {
          if (embedding2.length !== embedding.length) {
            console.warn(`Embedding length mismatch for dandiset ${dandisetId}: expected ${embedding.length}, got ${embedding2.length}`);
            continue;
          }
          const cs = computeCosineSimilarity(embedding, embedding2);
          if (cs > maxCosineSimilarity) {
            maxCosineSimilarity = cs;
          }
        }
        cosineSimilarities.push(maxCosineSimilarity);
      }
      else {
        cosineSimilarities.push(-99);
      }
    }
    // Sort dandisets by cosine similarity in descending order
    const sortedDandisets = dandisets.map((ds, index) => ({
      ...ds,
      cosineSimilarity: cosineSimilarities[index]
    })).sort((a, b) => b.cosineSimilarity - a.cosineSimilarity);
    return sortedDandisets.map(ds => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const {cosineSimilarity, ...rest} = ds; // Remove cosineSimilarity from the result
      return rest;
    }
    );
  }
}

const computeCosineSimilarity = (vec1: number[], vec2: number[]): number => {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must be of the same length for cosine similarity');
  }
  const dotProduct = vec1.reduce((sum, value, index) => sum + value * vec2[index], 0);
  const magnitude1 = Math.sqrt(vec1.reduce((sum, value) => sum + value * value, 0));
  const magnitude2 = Math.sqrt(vec2.reduce((sum, value) => sum + value * value, 0));
  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0; // Avoid division by zero
  }
  return dotProduct / (magnitude1 * magnitude2);
}

const computeSemanticEmbedding = async (query: string): Promise<number[] | undefined> => {
  const model = "text-embedding-3-large"
  const response = await openai.embeddings.create({
    input: query,
    model: model,
    encoding_format: "float"
  });
  if (response.data && response.data.length > 0 && response.data[0].embedding) {
    if (!Array.isArray(response.data[0].embedding) || response.data[0].embedding.length === 0) {
      throw new Error('Embedding is empty or not an array');
    }
    return response.data[0].embedding;
  } else {
    throw new Error('No embedding data returned from OpenAI API');
  }
}

const getEmbeddingsForDandiset = (dandisetId: string): number[][] | undefined => {
  const fname = `${dandiBaseDir}/dandisets/${dandisetId}/embeddings.json`;
  if (!fs.existsSync(fname)) {
    return undefined;
  }
  const fileContent = fs.readFileSync(fname, 'utf8');
  const content = JSON.parse(fileContent);
  return content.map((a: {text: string, embedding: number[], model: string}) => (
    a.embedding
  ));
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

const dandiBaseDir = "../data";

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
  get nwbFiles(): DandiInterfaceNwbFile[] {
    const dandisetFname = `${dandiBaseDir}/dandisets/${this.dandiset_id}/dandiset.json`;
    if (!fs.existsSync(dandisetFname)) {
      console.warn(`Dandiset metadata file not found: ${dandisetFname}`);
      return [];
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
  dandisetMetadata(): DandisetMetadata {
    const dandisetFname = `${dandiBaseDir}/dandisets/${this.dandiset_id}/dandiset.json`;
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
  private assetData: {
    dandiset_id: string;
    asset_id: string;
    session_description: string;
    subject: {
      age: string;
      sex: string;
      genotype: string;
      species: string;
      subject_id: string;
      strain?: string;
      specimen_name?: string;
    };
    neurodata_objects: {
      path: string;
      type: string;
      description: string;
    }[];
  } | undefined;
  constructor(
    public dandiInterface: DandiInterface,
    public dandiset_id: string,
    public version: string,
    public path: string,
    public size: number,
    public asset_id: string
  ) {
  }

  _loadAssetData = () => {
    if (this.assetData) return;
    const fname = `${dandiBaseDir}/dandisets/${this.dandiset_id}/assets.v7/${this.asset_id}.json`;
    if (!fs.existsSync(fname)) {
      return
    }
    const fileContent = fs.readFileSync(fname, 'utf8');
    try {
      this.assetData = JSON.parse(fileContent);
    }
    catch (error) {
      throw new Error(`Failed to parse JSON from ${fname}: ${error}`);
    }
    if (!this.assetData) {
      throw new Error(`Asset data is empty for ${fname}`);
    }
    if (this.assetData.dandiset_id !== this.dandiset_id || this.assetData.asset_id !== this.asset_id) {
      throw new Error(`Asset ID or dandiset ID mismatch: expected ${this.dandiset_id}/${this.asset_id}, got ${this.assetData.dandiset_id}/${this.assetData.asset_id}`);
    }
  }

  get neurodataObjects(): DandiInterfaceNeurodataObject[] {
    this._loadAssetData();
    if (!this.assetData) {
      // may not be created yet
      return []
    }
    return this.assetData.neurodata_objects.map(no => new DandiInterfaceNeurodataObject({
      dandisetId: this.dandiset_id,
      version: this.version,
      assetId: this.asset_id,
      path: no.path,
      neurodataType: no.type,
      description: no.description
    }));
  }
  get session_description(): string {
    this._loadAssetData();
    if (!this.assetData) {
      // may not be created yet
      return '';
    }
    return this.assetData.session_description || '';
  }
  get subject() {
    this._loadAssetData();
    if (!this.assetData) {
      // may not be created yet
      return {};
    }
    return this.assetData.subject || {};
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
  const openNeuroInterface = new OpenNeuroInterface({onStatusUpdate});

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
    findDandisets: async (o: {search?: string, semanticSearch?: string}) => {
      return await dandiInterface.findDandisets(o);
    },
    getDandiset: async (o: {dandisetId: string}) => {
      return await dandiInterface.getDandiset(o);
    },
    semanticSortDandisets: async (dandisets: DandisetInfo[], query: string) => {
      return await dandiInterface.semanticSortDandisets(dandisets, query);
    },
    getOpenNeuroDatasets: async () => {
      return await openNeuroInterface.getDatasets();
    },
    getOpenNeuroDataset: async (o: {datasetId: string}) => {
      return await openNeuroInterface.getDataset(o);
    },
    semanticSortOpenNeuroDatasets: async (datasets: OpenNeuroDatasetInfo[], query: string) => {
      return await openNeuroInterface.semanticSortDatasets(datasets, query);
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

const doDandisetSemanticSearch = async (query: string, restrictToDandisets?: string[]): Promise<string[]> => {
  const url = 'https://neurosift-chat-agent-tools.vercel.app/api/dandi_semantic_search';
  const params: {[key: string]: any} = {
    query,
    limit: 20
  }
  if (restrictToDandisets && restrictToDandisets.length > 0) {
    params['dandisets'] = restrictToDandisets;
  }
  // POST
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  });
  if (!response.ok) {
    throw new Error(`Failed to perform semantic search: ${response.statusText}`);
  }
  const data: any = await response.json();
  if (!data) {
    throw new Error('Semantic search returned no data');
  }
  if (typeof data !== 'object' || !Array.isArray(data.results)) {
    throw new Error('Semantic search returned invalid data format');
  }
  return data.results.map((item: {id: string}) => item.id);
};

///// OpenNeuro Interface

const openNeuroBaseDir = "../../openneuro-index/data";

export interface OpenNeuroDatasetInfo {
  dataset_id: string;
  name: string;
  dataset_created: string;
  snapshot_created: string;
  snapshot_tag: string;
  snapshot_readme: string;
  snapshot_total_files: number;
  snapshot_size: number;
}

class OpenNeuroInterface {
  constructor(public o: {onStatusUpdate: (status: string) => void}) {
    this.o.onStatusUpdate('OpenNeuro Interface initialized');
  }
  async getDataset(o: {datasetId: string}): Promise<OpenNeuroDatasetInfo | undefined> {
    this.o.onStatusUpdate(`Getting OpenNeuro dataset: ${o.datasetId}`);
    const fname = `${openNeuroBaseDir}/datasets/${o.datasetId}/dataset.json`;
    if (!fs.existsSync(fname)) {
      return undefined;
    }
    const fileContent = fs.readFileSync(fname, 'utf8');
    let data: OpenNeuroDatasetInfo;
    try {
      data = JSON.parse(fileContent);
    } catch (error) {
      throw new Error(`Failed to parse JSON from ${fname}: ${error}`);
    }
    if (data.dataset_id !== o.datasetId) {
      console.warn(`Dataset ID mismatch: expected ${o.datasetId}, got ${data.dataset_id}`);
      return undefined;
    }
    return data;
  }
  async getDatasets(): Promise<OpenNeuroInterfaceDataset[]> {
    this.o.onStatusUpdate('Getting OpenNeuro datasets...');
    const fname = `${openNeuroBaseDir}/openneuro.json`;
    if (!fs.existsSync(fname)) {
      throw new Error(`OpenNeuro data file not found: ${fname}`);
    }
    const fileContent = fs.readFileSync(fname, 'utf8');
    let data: {datasets: OpenNeuroDatasetInfo[]};
    try {
      data = JSON.parse(fileContent);
    }
    catch (error) {
      throw new Error(`Failed to parse JSON from ${fname}: ${error}`);
    }
    return data.datasets.map(ds => new OpenNeuroInterfaceDataset(
      this,
      ds.dataset_id,
      ds.name,
      ds.dataset_created,
      ds.snapshot_created,
      ds.snapshot_tag,
      ds.snapshot_readme,
      ds.snapshot_total_files,
      ds.snapshot_size
    ));
  }
  async semanticSortDatasets(datasets: OpenNeuroDatasetInfo[], query: string): Promise<OpenNeuroDatasetInfo[]> {
    if (!query) {
      throw new Error('Query must be provided for semantic sorting');
    }
    const embedding = await computeSemanticEmbedding(query);
    if (!embedding) {
      throw new Error('Failed to compute semantic embedding for query');
    }
    const cosineSimilarities: number[] = [];
    for (const ds of datasets) {
      const datasetId = ds.dataset_id;
      const embeddings2 = getEmbeddingsForOpenNeuroDataset(datasetId);
      if (embeddings2) {
        // Compute cosine similarity
        let maxCosineSimilarity = 0;
        for (const embedding2 of embeddings2) {
          if (embedding2.length !== embedding.length) {
            console.warn(`Embedding length mismatch for dataset ${datasetId}: expected ${embedding.length}, got ${embedding2.length}`);
            continue;
          }
          const cs = computeCosineSimilarity(embedding, embedding2);
          if (cs > maxCosineSimilarity) {
            maxCosineSimilarity = cs;
          }
        }
        cosineSimilarities.push(maxCosineSimilarity);
      }
      else {
        cosineSimilarities.push(-99);
      }
    }
    // Sort datasets by cosine similarity in descending order
    const sortedDatasets = datasets.map((ds, index) => ({
      ...ds,
      cosineSimilarity: cosineSimilarities[index]
    })).sort((a, b) => b.cosineSimilarity - a.cosineSimilarity);
    return sortedDatasets.map(ds => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const {cosineSimilarity, ...rest} = ds; // Remove cosineSimilarity from the result
      return rest;
    }
    );
  }
}

const getEmbeddingsForOpenNeuroDataset = (datasetId: string): number[][] | undefined => {
  const fname = `${openNeuroBaseDir}/datasets/${datasetId}/embeddings.json`;
  if (!fs.existsSync(fname)) {
    return undefined;
  }
  const fileContent = fs.readFileSync(fname, 'utf8');
  const content = JSON.parse(fileContent);
  return content.map((a: {text: string, embedding: number[], model: string}) => (
    a.embedding
  ));
}

class OpenNeuroInterfaceDataset {
  constructor(
    public openNeuroInterface: OpenNeuroInterface,
    public dataset_id: string,
    public name: string,
    public dataset_created: string,
    public snapshot_created: string,
    public snapshot_tag: string,
    public snapshot_readme: string,
    public snapshot_total_files: number,
    public snapshot_size: number
  ) {
  }
}
