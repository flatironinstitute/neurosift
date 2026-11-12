import { getHdf5Group } from "../hdf5Interface";
import { ObjectType } from "../Types";

export const determineObjectType = async (
  nwbUrl: string,
  path: string,
): Promise<ObjectType> => {
  if (path === "/") {
    return "group";
  }
  const parentPath = path.substring(0, path.lastIndexOf("/"));
  const parentGroup = await getHdf5Group(nwbUrl, parentPath);
  if (!parentGroup) {
    console.error("Parent group not found:", parentPath);
    return "group";
  }
  if (parentGroup.subgroups.find((sg) => sg.path === path)) {
    return "group";
  }
  if (parentGroup.datasets.find((ds) => ds.path === path)) {
    return "dataset";
  }
  console.error("Object not found:", path);
  return "group";
};
