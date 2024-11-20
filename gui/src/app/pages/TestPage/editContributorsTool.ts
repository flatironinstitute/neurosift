import { ToolItem } from "neurosift-lib/pages/ChatPage/ToolItem";
import { contributorSchema, validateContributor } from "./dandisetMetaSchema";

const dandisetObjectsDetailedDescription = `
You use this tool to change the contributors of a Dandiset.

If the tool returns an error, don't attempt the call again, just notify the user.

The parameter new_contributors is the JSON of an object with the following schema:

${JSON.stringify(contributorSchema || {})}


`;

type EditContributorsTool = (onChange: (obj: any) => void) => ToolItem;

export const editContributorsTool: EditContributorsTool = (onChange) => ({
  tool: {
    type: "function" as any,
    function: {
      name: "edit_contributors",
      description: `Change the contributors of a Dandiset. Returns "ok" if successful. If unsuccessful, returns an error message.`,
      parameters: {
        type: "object",
        properties: {
          new_contributors: {
            type: "string",
            description: "The JSON text of the new contributors object",
          },
        },
      },
    },
  },
  detailedDescription: dandisetObjectsDetailedDescription,
  function: async (
    args: any,
    onLogMessage: (title: string, message: string) => void,
  ) => {
    const new_contributors: string = args.new_contributors;
    const x = JSON.parse(new_contributors);
    const { valid, errors } = validateContributor(x);
    if (!valid) {
      console.warn(x);
      console.error("Error validating new contributors", errors);
      return `Error: ${JSON.stringify(errors)}`;
    }
    onChange(JSON.parse(new_contributors));
    return "ok";
  },
});
