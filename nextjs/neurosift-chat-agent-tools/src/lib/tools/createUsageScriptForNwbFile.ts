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
  const stimulusPresentationGroup = await getHdf5Group(
    nwbUrl,
    "/stimulus/presentation",
  );
  if (stimulusPresentationGroup) {
    moduleGroups.push(stimulusPresentationGroup);
  }

  const moduleObjects: {
    variableName: string;
    objectExpression: string;
    neurodataType: string;
    description: string;
    group: RemoteH5Group;
  }[] = [];

  const processContainerGroup = async (
    containerGroup: RemoteH5Group,
    containerGroupExpression: string,
  ) => {
    for (const x of containerGroup.subgroups) {
      const group = await getHdf5Group(nwbUrl, x.path);
      if (group && x.attrs.neurodata_type) {
        const neurodataType = x.attrs.neurodata_type;
        const variableName = makeValidVariableName(x.name);
        const objectExpression = `${containerGroupExpression}["${x.name}"]`;
        const description = x.attrs.description || "";
        moduleObjects.push({
          variableName,
          objectExpression,
          neurodataType,
          description,
          group,
        });
        if (
          [
            "ProcessingModule",
            "LFP",
            "Fluorescence",
            "ImageSegmentation",
            "PupilTracking",
            "EyeTracking",
          ].includes(neurodataType)
        ) {
          await processContainerGroup(group, objectExpression);
        }
      }
    }
  };
  for (const group of moduleGroups) {
    let expression = `nwb.${nameFromPath(group.path)}`
    if (group.path === "/stimulus/presentation") {
      // special case for stimulus presentation
      expression = `nwb.stimulus`;
    }

    await processContainerGroup(group, expression);
  }

  const handleUnits = async (unitsGroup: RemoteH5Group, expr: string) => {
    try {
      const unitsPath = unitsGroup.path;
      const idDataset = await getHdf5Dataset(nwbUrl, `${unitsPath}/id`);
      if (!idDataset) return;
      const colnames = unitsGroup.attrs.colnames;
      if (!colnames) {
        throw new Error("units group does not have colnames attribute");
      }
      if (!Array.isArray(colnames)) {
        throw new Error("units group colnames attribute is not an array");
      }
      const idData = await getHdf5DatasetData(nwbUrl, `${unitsPath}/id`, {});
      if (!idData) {
        throw new Error("Unable to load units/id dataset data");
      }
      const numUnits = idData.length;
      s += "\n";
      s += `units = ${expr} # (Units)\n`;
      s += `units.colnames # (Tuple[str]) (${colnames.map((x) => `"${x}"`).join(", ")})\n`;
      s += `unit_ids = units["id"].data # len(unit_ids) == ${numUnits} (number of units is ${numUnits})\n`;
      for (const colname of colnames) {
        const dataset = unitsGroup.datasets.find((x) => x.name === colname);
        if (!dataset) {
          throw new Error(`Unable to find dataset for column ${colname}`);
        }
        const index_dataset = unitsGroup.datasets.find(
          (x) => x.name === `${colname}_index`,
        );
        if (!index_dataset) {
          s += `units["${colname}"].data # (np.ndarray) shape ${shapeToString(dataset.shape)}; dtype ${dataset.dtype}; ${dataset.attrs.description}\n`;
        } else {
          s += `unit_index = 0 # Can range from 0 to ${numUnits - 1}\n`;
          if (colname === "spike_times") {
            s += `units["${colname}"][unit_index] # (np.array) spike times for unit at index unit_index\n`;
          } else {
            s += `units["${colname}"][unit_index] # (np.ndarray) vector of data for unit at index unit_index\n`;
          }
        }
      }
    } catch (e) {
      console.error("Problem loading units");
      console.error(e);
    }
  };

  for (const obj of moduleObjects) {
    s += `\n`;
    s += `${obj.variableName} = ${obj.objectExpression} # (${obj.neurodataType}) ${obj.description}\n`;

    // TimeSeries or ElectricalSeries or RoiResponseSeries or SpatialSeries
    if (
      [
        "TimeSeries",
        "ElectricalSeries",
        "RoiResponseSeries",
        "SpatialSeries",
      ].includes(obj.neurodataType)
    ) {
      const dataDataset = obj.group.datasets.find((x) => x.name === "data");

      if (dataDataset) {
        s += `${obj.variableName}.data # (h5py.Dataset) shape ${shapeToString(dataDataset.shape)}; dtype ${dataDataset.dtype}\n`;
      }
    }

    if (obj.neurodataType === "ElectricalSeries") {
      const electrodesDataset = obj.group.datasets.find(
        (x) => x.name === "electrodes",
      );
      if (electrodesDataset) {
        const electrodesDatasetNeurodataType =
          electrodesDataset.attrs.neurodata_type;
        s += `electrodes = ${obj.variableName}.electrodes # (${electrodesDatasetNeurodataType}) num. electrodes: ${electrodesDataset.shape[0]}\n`;
        if (electrodesDatasetNeurodataType === "DynamicTableRegion") {
          s += `# This is a reference into the nwb.electrodes table and can be used in the same way\n`;
          s += `# For example, electrode_ids = electrodes["id"].data[:] # len(electrode_ids) == ${electrodesDataset.shape[0]}\n`;
          s += `# And the other columns can be accessed in the same way\n`;
          s += `# It's the same table, but a subset of the rows.\n`;
        }
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
      for (const ds of obj.group.datasets) {
        s += `${obj.variableName}["${ds.name}"] # (h5py.Dataset) shape ${shapeToString(ds.shape)}; dtype ${ds.dtype} ${ds.attrs.description}\n`;
      }
    }

    if (["OnePhotonSeries", "TwoPhotonSeries"].includes(obj.neurodataType)) {
      // TODO: handle imaging plane more thoroughly. Example: https://neurosift.app/nwb?url=https://api.dandiarchive.org/api/assets/193fee16-550e-4a8f-aab8-2383f6d57a03/download/&dandisetId=001174&dandisetVersion=draft
      s += `${obj.variableName}.imaging_plane # (ImagingPlane)\n`;
      const dataDataset = obj.group.datasets.find((x) => x.name === "data");
      if (dataDataset) {
        if (dataDataset.shape.length === 3) {
          s += `${obj.variableName}.data # (h5py.Dataset) shape ${shapeToString(dataDataset.shape)} [ num_frames, num_rows, num_columns ]; dtype ${dataDataset.dtype}\n`;
        } else {
          s += `${obj.variableName}.data # (h5py.Dataset) shape ${shapeToString(dataDataset.shape)}; dtype ${dataDataset.dtype}\n`;
        }
      }
    }

    if (["PlaneSegmentation"].includes(obj.neurodataType)) {
      const imageMaskDataset = await getHdf5Dataset(
        nwbUrl,
        `${obj.group.path}/image_mask`,
      );
      if (imageMaskDataset) {
        s += `${obj.variableName}["image_mask"].data # (h5py.Dataset) shape ${shapeToString(imageMaskDataset.shape)} [ num_masks, num_rows, num_columns ]; dtype ${imageMaskDataset.dtype}\n`;
      }
    }

    // Units
    if (obj.neurodataType === "Units") {
      handleUnits(obj.group, `${obj.objectExpression}`);
    }

    // Images
    if (obj.neurodataType === "Images") {
      for (const ds of obj.group.datasets) {
        const nt = ds.attrs.neurodata_type;
        const description = ds.attrs.description || "";
        if (nt === "GrayscaleImage") {
          s += `${obj.variableName}["${ds.name}"].data # (h5py.Dataset) shape ${shapeToString(ds.shape)}; dtype ${ds.dtype}; ${description}\n`;
        }
      }
    }

    // IndexSeries
    if (obj.neurodataType === "IndexSeries") {
      const dataDataset = obj.group.datasets.find((x) => x.name === "data");
      if (dataDataset) {
        s += `${obj.variableName}.data # (h5py.Dataset) shape ${shapeToString(dataDataset.shape)}; dtype ${dataDataset.dtype}\n`;
      }
      const indexedImages = obj.group.subgroups.find(
        (x) => x.name === "indexed_images",
      );
      if (indexedImages) {
        s += `${obj.variableName}.indexed_images # Images\n`;
        s += `for k in ${obj.variableName}.indexed_images.images.keys():\n`;
        s += `    image = ${obj.variableName}.indexed_images.images[k]\n`;
        s += `    print(f'Image {k}: {image.data.shape})')\n`;
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
      s += `${obj.variableName}.starting_time # ${await getDatasetValueString(nwbUrl, startingTimeDataset.path)} sec\n`;
      s += `${obj.variableName}.rate # ${await getDatasetAttrString(nwbUrl, startingTimeDataset.path, "rate")} Hz\n`;
    }
  }

  // extracellular ephys electrodes
  const handleECElectrodes = async (
    expression: string,
    ecElectrodesGroup: RemoteH5Group,
    typeName: string,
  ) => {
    try {
      const idDataset = await getHdf5Dataset(
        nwbUrl,
        "/general/extracellular_ephys/electrodes/id",
      );
      if (!idDataset) return;
      const colnames = ecElectrodesGroup.attrs.colnames;
      if (!colnames) {
        throw new Error("electrodes group does not have colnames attribute");
      }
      if (!Array.isArray(colnames)) {
        throw new Error("electrodes group colnames attribute is not an array");
      }
      const idData = await getHdf5DatasetData(
        nwbUrl,
        "/general/extracellular_ephys/electrodes/id",
        {},
      );
      if (!idData) {
        throw new Error("Unable to load electrodes/id dataset data");
      }
      const numElectrodes = idData.length;
      s += "\n";
      s += `electrodes = ${expression} # (${typeName})\n`;
      s += `electrodes.colnames # (Tuple[str]) (${colnames.map((x) => `"${x}"`).join(", ")})\n`;
      s += `electrode_ids = electrodes["id"].data[:] # len(electrode_ids) == ${numElectrodes} (number of electrodes is ${numElectrodes})\n`;
      for (const colname of colnames) {
        const dataset = ecElectrodesGroup.datasets.find(
          (x) => x.name === colname,
        );
        if (!dataset) {
          throw new Error(`Unable to find dataset for column ${colname}`);
        }
        s += `electrodes["${colname}"].data[:] # (np.ndarray) shape ${shapeToString(dataset.shape)}; dtype ${dataset.dtype}; ${dataset.attrs.description}\n`;
      }
    } catch (e) {
      console.error("Problem loading extracellular ephys electrodes");
      console.error(e);
    }
  };
  const ecElectrodesGroup = await getHdf5Group(
    nwbUrl,
    "/general/extracellular_ephys/electrodes",
  );
  if (ecElectrodesGroup) {
    await handleECElectrodes(
      "nwb.electrodes",
      ecElectrodesGroup,
      "DynamicTable",
    );
  }

  // /units
  const unitsGroup = await getHdf5Group(nwbUrl, "/units");
  const idDataset = await getHdf5Dataset(nwbUrl, "/units/id");
  if (unitsGroup && idDataset) {
    await handleUnits(unitsGroup, "nwb.units");
  }

  return s;
};

const nameFromPath = (path: string) => {
  const parts = path.split("/");
  return parts[parts.length - 1];
};

const shapeToString = (shape: number[]) => {
  return `[${shape.join(", ")}]`;
};

const makeValidVariableName = (name: string) => {
  // replace spaces and dashes with underscores
  return name.replace(/[\s-]/g, "_");
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
