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

/** Whether the file has an object at this path, judged by what its parent group lists. */
export const objectExists = async (
  nwbUrl: string,
  path: string,
): Promise<boolean> => {
  if (path === "/") return true;
  const parent = await getHdf5Group(
    nwbUrl,
    path.substring(0, path.lastIndexOf("/")) || "/",
  );
  if (!parent) return false;
  return (
    parent.subgroups.some((sg) => sg.path === path) ||
    parent.datasets.some((ds) => ds.path === path)
  );
};
