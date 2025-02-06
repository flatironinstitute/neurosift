import ReferenceComponent from "./ReferenceElement";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const valueToElement = (val: any): any => {
  if (typeof val === "string") {
    return val;
  } else if (typeof val === "number") {
    return val + "";
  } else if (typeof val === "boolean") {
    return val ? "true" : "false";
  } else if (typeof val === "object") {
    if (Array.isArray(val)) {
      if (val.length < 200) {
        return `[${val.map((x) => valueToElement(x)).join(", ")}]`;
      } else {
        return `[${val
          .slice(0, 200)
          .map((x) => valueToElement(x))
          .join(", ")} ...]`;
      }
    }
    // check for Float64Array, Int32Array, etc.
    else if (
      val.constructor &&
      [
        "Float64Array",
        "Int32Array",
        "Uint32Array",
        "Uint8Array",
        "Uint16Array",
        "Int8Array",
        "Int16Array",
      ].includes(val.constructor.name)
    ) {
      const array = Array.from(val);
      return valueToElement(array);
    } else {
      if ("_REFERENCE" in val) {
        return <ReferenceComponent value={val["_REFERENCE"]} />;
      } else {
        return JSON.stringify(serializeBigInt(val));
      }
    }
  } else {
    return "<>";
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const serializeBigInt = (val: any): any => {
  if (typeof val === "bigint") {
    // convert to number
    return Number(val);
  } else if (typeof val === "object") {
    if (Array.isArray(val)) {
      return val.map((x) => serializeBigInt(x));
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
