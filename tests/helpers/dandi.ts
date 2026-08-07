import type { Page } from "@playwright/test";

/**
 * Stubs the DANDI Archive API with a fixed payload for a synthetic dandiset.
 *
 * Everything below is invented — identifier, title, version, description,
 * contributors, counts. Nothing here mirrors a real dandiset, deliberately: a
 * fixture carrying a real dandiset's identity would read as archive content and
 * invite someone to trust numbers that were never fetched.
 *
 * It is a fixture rather than a live query so the rendered page is identical on
 * every run. Snapshotting the real API would rebaseline whenever the dandiset is
 * edited, and would fail whenever api.dandiarchive.org is slow or unreachable.
 *
 * Three endpoints are involved (see src/pages/DandisetPage/):
 *   /api/dandisets/{id}                              -> useQueryDandiset
 *   /api/dandisets/{id}/versions/{v}/info/           -> useDandisetVersionInfo
 *   /api/dandisets/{id}/versions/{v}/assets/paths/   -> useLazyDandisetPaths
 */

const DANDISET_ID = "000000";
const VERSION = "0.000000.0000";

const VERSION_STUB = {
  version: VERSION,
  name: "Example Dandiset (visual test fixture)",
  asset_count: 12,
  size: 1234567890,
  status: "Valid",
  created: "2020-01-01T00:00:00.000000Z",
  modified: "2020-01-02T00:00:00.000000Z",
};

const dandisetResponse = {
  identifier: DANDISET_ID,
  created: "2020-01-01T00:00:00.000000Z",
  modified: "2020-01-02T00:00:00.000000Z",
  contact_person: "Example, Contact",
  embargo_status: "OPEN",
  most_recent_published_version: VERSION_STUB,
  draft_version: { ...VERSION_STUB, version: "draft" },
};

const versionInfo = {
  ...VERSION_STUB,
  dandiset: {
    identifier: DANDISET_ID,
    created: "2020-01-01T00:00:00.000000Z",
    modified: "2020-01-02T00:00:00.000000Z",
    contact_person: "Example, Contact",
    embargo_status: "OPEN",
  },
  asset_validation_errors: [],
  version_validation_errors: [],
  contact_person: "Example, Contact",
  metadata: {
    id: `DANDI:${DANDISET_ID}/${VERSION}`,
    url: `https://dandiarchive.org/dandiset/${DANDISET_ID}/${VERSION}`,
    name: "Example Dandiset (visual test fixture)",
    about: [],
    access: [{ status: "dandi:OpenAccess", schemaKey: "AccessRequirements" }],
    license: ["spdx:CC-BY-4.0"],
    version: VERSION,
    "@context":
      "https://raw.githubusercontent.com/dandi/schema/master/releases/0.6.4/context.json",
    citation: "Example Dandiset (visual test fixture). Not a real citation.",
    keywords: ["electrophysiology", "Neuropixels", "decision-making"],
    protocol: [],
    schemaKey: "Dandiset",
    identifier: `DANDI:${DANDISET_ID}`,
    repository: "https://dandiarchive.org",
    contributor: [
      {
        name: "Doe, Jane",
        email: "jane.doe@example.org",
        roleName: ["dcite:ContactPerson"],
        schemaKey: "Person",
        affiliation: [],
        includeInCitation: true,
      },
      {
        name: "Roe, Richard",
        email: "richard.roe@example.org",
        roleName: ["dcite:Author"],
        schemaKey: "Person",
        affiliation: [],
        includeInCitation: true,
      },
    ],
    dateCreated: "2020-01-01T00:00:00.000000Z",
    description:
      "Invented description for the visual snapshot test — this dandiset does " +
      "not exist. It is long enough to exercise the overview panel's truncation " +
      "and its 'read more' control.",
    studyTarget: [],
    assetsSummary: {
      species: [
        {
          name: "Mus musculus - House mouse",
          schemaKey: "SpeciesType",
          identifier: "http://purl.obolibrary.org/obo/NCBITaxon_10090",
        },
      ],
      approach: [
        { name: "electrophysiological approach", schemaKey: "ApproachType" },
      ],
      schemaKey: "AssetsSummary",
      dataStandard: [
        {
          name: "Neurodata Without Borders (NWB)",
          schemaKey: "StandardsType",
          identifier: "RRID:SCR_015242",
        },
      ],
      numberOfBytes: 1234567890,
      numberOfFiles: 12,
      numberOfSubjects: 4,
      variableMeasured: ["Units", "ElectrodeGroup"],
      measurementTechnique: [
        {
          name: "spike sorting technique",
          schemaKey: "MeasurementTechniqueType",
        },
      ],
    },
    schemaVersion: "0.6.4",
    ethicsApproval: [],
    wasGeneratedBy: [],
    relatedResource: [],
    manifestLocation: [],
  },
};

const assetPaths = {
  count: 3,
  results: [
    {
      path: "sub-example-01",
      version: 1,
      aggregate_files: 6,
      aggregate_size: 823456789,
      asset: null,
    },
    {
      path: "sub-example-02",
      version: 1,
      aggregate_files: 5,
      aggregate_size: 402345678,
      asset: null,
    },
    {
      path: "dandiset.yaml",
      version: 1,
      aggregate_files: 1,
      aggregate_size: 8765,
      asset: {
        asset_id: "00000000-0000-0000-0000-000000000001",
        url: `https://api.dandiarchive.org/api/assets/00000000-0000-0000-0000-000000000001/download/`,
      },
    },
  ],
};

const json = (body: unknown) => ({
  status: 200,
  contentType: "application/json",
  body: JSON.stringify(body),
});

export async function mockDandisetPage(page: Page): Promise<void> {
  // Playwright checks route handlers in REVERSE registration order, so the
  // broadest pattern is registered first and the most specific ones last —
  // otherwise the catch-all would swallow the info/ and paths/ requests.
  await page.route(
    `https://api.dandiarchive.org/api/dandisets/${DANDISET_ID}**`,
    (route) => route.fulfill(json(dandisetResponse)),
  );
  await page.route(
    `https://api.dandiarchive.org/api/dandisets/${DANDISET_ID}/versions/*/info/**`,
    (route) => route.fulfill(json(versionInfo)),
  );
  await page.route(
    `https://api.dandiarchive.org/api/dandisets/${DANDISET_ID}/versions/*/assets/paths/**`,
    (route) => route.fulfill(json(assetPaths)),
  );
}
