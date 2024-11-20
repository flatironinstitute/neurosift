import { ToolItem } from "neurosift-lib/pages/ChatPage/ToolItem";

const dandisetObjectsDetailedDescription = `
You use this tool to change the contributors of a Dandiset.

The parameter new_contributors is the JSON of an object with the following schema:

export type DandisetContributors = [
  Person | Organization,
  ...(Person | Organization)[],
];
export interface Person {
  id?: ID1;
  schemaKey: SchemaKey1;
  identifier?: AnORCIDIdentifier;
  name: Name;
  email?: Email;
  url?: URL;
  roleName?: Role;
  includeInCitation?: IncludeContributorInCitation;
  awardNumber?: IdentifierForAnAward;
  affiliation?: Affiliation;
  [k: string]: unknown;
}
export interface Organization {
  id?: ID3;
  schemaKey: SchemaKey3;
  identifier?: ARorOrgIdentifier1;
  name?: Name2;
  email?: Email1;
  url?: URL1;
  roleName?: Role1;
  includeInCitation?: IncludeContributorInCitation1;
  awardNumber?: IdentifierForAnAward1;
  contactPoint?: OrganizationContactInformation;
  [k: string]: unknown;
}
`;

type EditContributorsTool = (onChange: (obj: any) => void) => ToolItem;

export const editContributorsTool: EditContributorsTool = (onChange) => ({
  tool: {
    type: "function" as any,
    function: {
      name: "edit_contributors",
      description: `Change the contributors of a Dandiset. Returns "ok" if successful.`,
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
    onChange(JSON.parse(new_contributors));
    return "ok";
  },
});
