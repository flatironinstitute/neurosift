/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useEffect, useState } from "react";
import { getHdf5DatasetData } from "./hdf5Interface";

const useDatasetData = (url: string | null, path: string) => {
  const [data, setData] = useState<any | undefined>(undefined);
  useEffect(() => {
    if (!url) return;
    const load = async () => {
      const d = await getHdf5DatasetData(url, path, {});
      setData(d);
    };
    load();
  }, [url, path]);
  return { data };
};

const DatasetDataView: FunctionComponent<{
  nwbFile: string | null;
  path: string;
  renderer?: (val: any) => string;
}> = ({ nwbFile, path, renderer }) => {
  const { data: datasetData } = useDatasetData(nwbFile, path);
  const [isExpanded, setIsExpanded] = useState(false);

  if (datasetData === undefined) return <span>Loading...</span>;

  const stringData = renderer
    ? renderer(datasetData)
    : valueToString2(datasetData);
  const isLongContent =
    typeof stringData === "string" && stringData.length > 500;

  if (!isLongContent) {
    return <span>{stringData}</span>;
  }

  return (
    <div>
      <span>{isExpanded ? stringData : abbreviate(stringData, 500)}</span>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          marginLeft: 8,
          background: "none",
          border: "none",
          color: "#0066cc",
          cursor: "pointer",
          padding: "2px 4px",
          fontSize: "0.9em",
        }}
      >
        {isExpanded ? "view less" : "read more"}
      </button>
    </div>
  );
};

const abbreviate = (str: string, maxLength: number) => {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
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

export default DatasetDataView;
