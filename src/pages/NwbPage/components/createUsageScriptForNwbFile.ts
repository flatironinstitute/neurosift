/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  getHdf5Dataset,
  getHdf5DatasetData,
  getHdf5Group,
} from "@hdf5Interface";
import { valueToString2 } from "../DatasetDataView";
import { RemoteH5Group } from "@remote-h5-file";

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
    if (obj.neurodataType === "TimeSeries") {
      const dataDataset = obj.group.datasets.find((x) => x.name === "data");
      const timestampsDataset = obj.group.datasets.find(
        (x) => x.name === "timestamps",
      );
      const startingTimeDataset = obj.group.datasets.find(
        (x) => x.name === "starting_time",
      );

      if (dataDataset) {
        s += `${obj.variableName}.data # (h5py.Dataset) shape ${shapeToString(dataDataset.shape)}; dtype ${dataDataset.dtype}\n`;
      }
      if (timestampsDataset) {
        s += `${obj.variableName}.timestamps # (h5py.Dataset) shape ${shapeToString(timestampsDataset.shape)}; dtype ${timestampsDataset.dtype}\n`;
      } else if (startingTimeDataset) {
        s += `${obj.variableName}.starting_time # ${getDatasetValueString(nwbUrl, startingTimeDataset.path)}\n`;
        s += `${obj.variableName}.rate # ${getDatasetAttrString(nwbUrl, startingTimeDataset.path, "rate")}\n`;
      }
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
    if (!d) return "";
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
    if (!d) return [];
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

/*
nwb.session_description # (str) 489
nwb.identifier # (str) 489
nwb.session_start_time # (datetime) 2022-07-08 00:00:00-05:00
nwb.file_create_date # (datetime) 2024-10-11 00:00:00-05:00
nwb.timestamps_reference_time # (datetime) 2022-07-08 00:00:00-05:00
nwb.experimenter # (List[str]) ['Armstrong, Alex', 'Vlasov, Yurii']
nwb.experiment_description # (str) Barrel cortex electrophysiology during tactile VR whisker-guided navigation
nwb.session_id # (str)
nwb.institution # (str) University of Illinois
nwb.keywords # (List[str]) ['barrel cortex', 'behavior', 'VR', 'S1', 'decision making']
nwb.protocol # (str) 20138
nwb.lab # (str) Vlasov BioLab
nwb.acquisition["cor_pos"] # (TimeSeries) VR feedback signal
nwb.acquisition["distance_abs"] # (TimeSeries) Absolute distance (cm) in trial
nwb.acquisition["distance_for"] # (TimeSeries) Forward distance (cm) in trial
nwb.acquisition["distance_lat"] # (TimeSeries) Lateral distance (cm) in trial
nwb.acquisition["speed_abs"] # (TimeSeries) Absolute speed (cm/s)
nwb.acquisition["speed_for"] # (TimeSeries) Forward speed (cm/s)
nwb.acquisition["speed_lat"] # (TimeSeries) Lateral speed (cm/s)
nwb.acquisition["trial"] # (TimeSeries) Trial number
nwb.acquisition["ts_local"] # (TimeSeries) Local timing in trial
nwb.trials # (TimeIntervals)
nwb.intervals["trials"] # (TimeIntervals) experimental trials
nwb.units # (Units)
nwb.subject # (Subject)

nwb.subject.age # (str) P63D
nwb.subject.age__reference # (str) birth
nwb.subject.description # (str) 489
nwb.subject.genotype # (str) Scnn1a-TG3-Cre x Ai32
nwb.subject.sex # (str) F
nwb.subject.species # (str) Mus musculus
nwb.subject.subject_id # (str) 489
nwb.subject.weight # (str) 0.02 kg
nwb.subject.date_of_birth # (datetime) 2022-05-01 00:00:00-05:00
*/

export default createUsageScriptForNwbFile;
