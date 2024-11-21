import dandisetSchema from "./dandiset.json";
import Ajv from "ajv";

interface Schema {
  $defs: Record<string, any>;
  properties: Record<string, any>;
  [key: string]: any;
}

function extractContributorSchema(schema: Schema): Schema {
  const ret: Schema = JSON.parse(JSON.stringify(schema));
  ret.properties = {
    contributor: schema.properties["contributor"],
  };
  ret.$defs = {};
  ret.required = ["contributor"];
  const includedDefs = new Set<string>();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const newDefs = new Set<string>();
    const handleItem = (item: any) => {
      if (!item) return;
      if (typeof item === "string") {
        if (item.startsWith("#/$defs/")) {
          const k = item.slice("#/$defs/".length);
          if (!includedDefs.has(k)) {
            newDefs.add(k);
          }
        }
      } else if (typeof item === "object") {
        for (const k in item) {
          handleItem(item[k]);
        }
      }
    };
    handleItem(ret);
    if (newDefs.size === 0) {
      break;
    }
    for (const k of newDefs) {
      includedDefs.add(k);
      ret.$defs[k] = schema.$defs[k];
    }
  }
  return ret;
}

export const contributorSchema = extractContributorSchema(dandisetSchema);
console.info("CONTRIBUTORS SCHEMA:", contributorSchema);

export const validateDandisetMetadata = (
  metadata: any,
): { valid: boolean; errors?: any } => {
  const ajv = new Ajv({ strict: false });
  // don't include the $schema property
  const dandisetSchema2: any = JSON.parse(JSON.stringify(contributorSchema));
  delete dandisetSchema2.$schema;
  const validate = ajv.compile(dandisetSchema2);
  const valid = validate(metadata);
  if (!valid) {
    return { valid: false, errors: validate.errors };
  }
  return { valid: true };
};

export const validateContributor = (
  contributor: any,
): { valid: boolean; errors?: any } => {
  const ajv = new Ajv({ strict: false });
  const contributorSchema2 = JSON.parse(JSON.stringify(contributorSchema));
  delete contributorSchema2.$schema;
  const validate = ajv.compile(contributorSchema2);
  const valid = validate(contributor);
  if (!valid) {
    return { valid: false, errors: validate.errors };
  }
  return { valid: true };
};
