/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  getHdf5Dataset,
  getHdf5DatasetData,
  getHdf5Group,
} from "./hdf5Interface";
import { RemoteH5Group } from "./remote-h5-file";

const createUsageScriptForNwbFile = async (nwbUrl: string) => {
  let s = "";

  // session_description
  const sessionDescription = await getDatasetValueString(
    nwbUrl,
    "/session_description",
  );
  s += `nwb.session_description # (str) ${sessionDescription}\n`;

  // identifier
  const identifier = await getDatasetValueString(nwbUrl, "/identifier");
  s += `nwb.identifier # (str) ${identifier}\n`;

  // session_start_time
  const sessionStartTime = await getDatasetValueString(
    nwbUrl,
    "/session_start_time",
  );
  s += `nwb.session_start_time # (datetime) ${sessionStartTime}\n`;

  // file_create_date
  const fileCreateDate = await getDatasetValueString(
    nwbUrl,
    "/file_create_date",
  );
  s += `nwb.file_create_date # (datetime) ${fileCreateDate}\n`;

  // timestamps_reference_time
  const timestampsReferenceTime = await getDatasetValueString(
    nwbUrl,
    "/timestamps_reference_time",
  );
  s += `nwb.timestamps_reference_time # (datetime) ${timestampsReferenceTime}\n`;

  // experimenter
  const experimenter = await getDatasetValueStringList(
    nwbUrl,
    "/general/experimenter",
  );
  s += `nwb.experimenter # (List[str]) [${experimenter.map((e) => `"${e}"`).join(", ")}]\n`;

  // experiment_description
  const experimentDescription = await getDatasetValueString(
    nwbUrl,
    "/general/experiment_description",
  );
  s += `nwb.experiment_description # (str) ${experimentDescription}\n`;

  // Where to get session_id?
  //   // session_id
  //   const sessionId = await getDatasetValueString(nwbUrl, "/general/session_id");
  //   s += `nwb.session_id # (str) ${sessionId}\n`;

  // institution
  const institution = await getDatasetValueString(
    nwbUrl,
    "/general/institution",
  );
  s += `nwb.institution # (str) ${institution}\n`;

  // keywords
  const keywords = await getDatasetValueStringList(nwbUrl, "/general/keywords");
  s += `nwb.keywords # (List[str]) [${keywords.map((k) => `"${k}"`).join(", ")}]\n`;

  // protocol
  const protocol = await getDatasetValueString(nwbUrl, "/general/protocol");
  s += `nwb.protocol # (str) ${protocol}\n`;

  // lab
  const lab = await getDatasetValueString(nwbUrl, "/general/lab");
  s += `nwb.lab # (str) ${lab}\n`;

  // subject
  s += `nwb.subject # (Subject)\n`;
  const subjectAge = await getDatasetValueString(
    nwbUrl,
    "/general/subject/age",
  );
  s += `nwb.subject.age # (str) ${subjectAge}\n`;
  const subjectAgeReference = await getDatasetAttrString(
    nwbUrl,
    "/general/subject/age",
    "reference",
  );
  s += `nwb.subject.age__reference # (str) ${subjectAgeReference}\n`;
  const subjectDescription = await getDatasetValueString(
    nwbUrl,
    "/general/subject/description",
  );
  s += `nwb.subject.description # (str) ${subjectDescription}\n`;
  const subjectGenotype = await getDatasetValueString(
    nwbUrl,
    "/general/subject/genotype",
  );
  s += `nwb.subject.genotype # (str) ${subjectGenotype}\n`;
  const subjectSex = await getDatasetValueString(
    nwbUrl,
    "/general/subject/sex",
  );
  s += `nwb.subject.sex # (str) ${subjectSex}\n`;
  const subjectSpecies = await getDatasetValueString(
    nwbUrl,
    "/general/subject/species",
  );
  s += `nwb.subject.species # (str) ${subjectSpecies}\n`;
  const subjectId = await getDatasetValueString(
    nwbUrl,
    "/general/subject/subject_id",
  );
  s += `nwb.subject.subject_id # (str) ${subjectId}\n`;
  const subjectWeight = await getDatasetValueString(
    nwbUrl,
    "/general/subject/weight",
  );
  s += `nwb.subject.weight # (str) ${subjectWeight}\n`;
  const subjectDateOfBirth = await getDatasetValueString(
    nwbUrl,
    "/general/subject/date_of_birth",
  );
  s += `nwb.subject.date_of_birth # (datetime) ${subjectDateOfBirth}\n`;

  const moduleGroups: RemoteH5Group[] = [];

  const acquisitionGroup = await getHdf5Group(nwbUrl, "/acquisition");
  if (acquisitionGroup) {
    moduleGroups.push(acquisitionGroup);
  }
  const analysisGroup = await getHdf5Group(nwbUrl, "/analysis");
  if (analysisGroup) {
    moduleGroups.push(analysisGroup);
  }
  const intervalsGroup = await getHdf5Group(nwbUrl, "/intervals");
  if (intervalsGroup) {
    moduleGroups.push(intervalsGroup);
  }
  const processingGroup = await getHdf5Group(nwbUrl, "/processing");
  if (processingGroup) {
    moduleGroups.push(processingGroup);
  }
  const stimulusGroup = await getHdf5Group(nwbUrl, "/stimulus");
  if (stimulusGroup) {
    moduleGroups.push(stimulusGroup);
  }

  const moduleObjects: {
    variableName: string;
    objectExpression: string;
    neurodataType: string;
    description: string;
    group: RemoteH5Group;
  }[] = [];

  for (const moduleGroup of moduleGroups) {
    for (const x of moduleGroup.subgroups) {
      const group = await getHdf5Group(nwbUrl, x.path);
      if (group && x.attrs.neurodata_type) {
        const neurodataType = x.attrs.neurodata_type;
        const variableName = makeValidVariableName(x.name);
        const objectExpression = `nwb.${getGroupNameFromPath(moduleGroup.path)}["${x.name}"]`;
        const description = x.attrs.description || "";
        moduleObjects.push({
          variableName,
          objectExpression,
          neurodataType,
          description,
          group,
        });
      }
    }
  }

  for (const obj of moduleObjects) {
    s += `\n`;
    s += `${obj.variableName} = ${obj.objectExpression} # (${obj.neurodataType}) ${obj.description}\n`;

    // TimeSeries or ElectricalSeries
    if (["TimeSeries", "ElectricalSeries"].includes(obj.neurodataType)) {
      const dataDataset = obj.group.datasets.find((x) => x.name === "data");

      if (dataDataset) {
        s += `${obj.variableName}.data # (h5py.Dataset) shape ${shapeToString(dataDataset.shape)}; dtype ${dataDataset.dtype}\n`;
      }
    }

    // ImageSeries
    if (["ImageSeries"].includes(obj.neurodataType)) {
      const externalFileDataset = obj.group.datasets.find(
        (x) => x.name === "external_file",
      );
      if (externalFileDataset) {
        s += `# Data for ${obj.variableName} is in an external file: ${await getDatasetValueString(nwbUrl, externalFileDataset.path)}\n`;
      }
    }

    // TimeIntervals
    if (obj.neurodataType === "TimeIntervals") {
      const startTimeDataset = obj.group.datasets.find(
        (x) => x.name === "start_time",
      );
      const stopTimeDataset = obj.group.datasets.find(
        (x) => x.name === "stop_time",
      );
      if (startTimeDataset) {
        s += `${obj.variableName}["start_time"].data # (h5py.Dataset) shape ${shapeToString(startTimeDataset.shape)}; dtype ${startTimeDataset.dtype}\n`;
      }
      if (stopTimeDataset) {
        s += `${obj.variableName}["stop_time"].data # (h5py.Dataset) shape ${shapeToString(stopTimeDataset.shape)}; dtype ${stopTimeDataset.dtype}\n`;
      }
    }

    // timestamps or starting time (applies to anything that has timestamps or starting_time)
    const timestampsDataset = obj.group.datasets.find(
      (x) => x.name === "timestamps",
    );
    const startingTimeDataset = obj.group.datasets.find(
      (x) => x.name === "starting_time",
    );
    if (timestampsDataset) {
      s += `${obj.variableName}.timestamps # (h5py.Dataset) shape ${shapeToString(timestampsDataset.shape)}; dtype ${timestampsDataset.dtype}\n`;
    } else if (startingTimeDataset) {
      s += `${obj.variableName}.starting_time # ${await getDatasetValueString(nwbUrl, startingTimeDataset.path)}\n`;
      s += `${obj.variableName}.rate # ${await getDatasetAttrString(nwbUrl, startingTimeDataset.path, "rate")}\n`;
    }
  }

  return s;
};

const shapeToString = (shape: number[]) => {
  return `[${shape.join(", ")}]`;
};

const makeValidVariableName = (name: string) => {
  // replace spaces and dashes with underscores
  return name.replace(/[\s-]/g, "_");
};

const getGroupNameFromPath = (path: string) => {
  const parts = path.split("/");
  return parts[parts.length - 1];
};

const getDatasetValueString = async (nwbUrl: string, datasetPath: string) => {
  try {
    const d = await getHdf5DatasetData(nwbUrl, datasetPath, {});
    return valueToString2(d);
  } catch {
    return "";
  }
};

const getDatasetValueStringList = async (
  nwbUrl: string,
  datasetPath: string,
) => {
  try {
    const d = await getHdf5DatasetData(nwbUrl, datasetPath, {});
    if (!Array.isArray(d)) return [valueToString2(d)];
    return d.map((v: any) => valueToString2(v));
  } catch {
    return [];
  }
};

const getDatasetAttrString = async (
  nwbUrl: string,
  datasetPath: string,
  attrName: string,
) => {
  try {
    const d = await getHdf5Dataset(nwbUrl, datasetPath);
    if (!d) return "";
    return valueToString2(d.attrs[attrName]);
  } catch {
    return "";
  }
};

const valueToString2 = (val: any): string => {
  // same as valueToString, but don't include the brackets for arrays
  if (typeof val === "string") {
    return val;
  } else if (typeof val === "number") {
    return val + "";
  } else if (typeof val === "boolean") {
    return val ? "true" : "false";
  } else if (typeof val === "object") {
    if (Array.isArray(val)) {
      return `${val.map((x) => valueToString2(x)).join(", ")}`;
    } else {
      return JSON.stringify(serializeBigInt(val));
    }
  } else {
    return "<>";
  }
};

const serializeBigInt = (val: any): any => {
  if (typeof val === "bigint") {
    // convert to number
    return Number(val);
  } else if (typeof val === "object") {
    if (Array.isArray(val)) {
      return val.map((x) => serializeBigInt(x));
    } else {
      const ret: { [key: string]: any } = {};
      for (const key in val) {
        ret[key] = serializeBigInt(val[key]);
      }
      return ret;
    }
  } else {
    return val;
  }
};

export default createUsageScriptForNwbFile;
