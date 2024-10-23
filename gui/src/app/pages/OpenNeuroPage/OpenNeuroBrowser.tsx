import { Hyperlink, SmallIconButton, VBoxLayout } from "@fi-sci/misc";
import { Search } from "@mui/icons-material";
import useRoute from "app/useRoute";
import { FunctionComponent, useCallback, useEffect, useState } from "react";
import OpenNeuroSearchResults from "./OpenNeuroSearchResults";

type Props = {
  width: number;
  height: number;
};

type OpenNeuroSearchResultItem = {
  // none
};

const topBarHeight = 12;
const searchBarHeight = 50;
const OpenNeuroBrowser: FunctionComponent<Props> = ({ width, height }) => {
  const { route, setRoute } = useRoute();
  if (route.page !== "openneuro")
    throw Error("Unexpected route for OpenNeuroBrowser: " + route.page);
  const [searchText, setSearchText] = useState<string>("");
  const [searchResult, setSearchResults] = useState<
    OpenNeuroDataset[] | undefined
  >(undefined);
  useEffect(() => {
    let canceled = false;
    setSearchResults(undefined);
    (async () => {
      const onDatasets = await fetchONDatasets(searchText);
      if (canceled) return;
      setSearchResults(onDatasets);
    })();
    return () => {
      canceled = true;
    };
  }, [searchText]);

  return (
    <VBoxLayout
      width={width}
      heights={[
        topBarHeight,
        searchBarHeight,
        height - topBarHeight - searchBarHeight,
      ]}
    >
      <div
        style={{
          position: "absolute",
          width,
          display: "flex",
          justifyContent: "right",
        }}
      ></div>
      <div>
        <SearchBar
          width={width}
          height={searchBarHeight}
          onSearch={setSearchText}
        />
      </div>
      <div>
        <OpenNeuroSearchResults
          width={width}
          height={height - searchBarHeight}
          searchResults={searchResult}
        />
      </div>
    </VBoxLayout>
  );
};

export type OpenNeuroDataset = {
  id: string;
  created: string;
  uploader: {
    id: string;
    name: string;
    orcid: string | null;
    __typename: string;
  };
  public: boolean;
  permissions: {
    id: string;
    userPermissions: {
      userId: string;
      level: string;
      access: string;
      user: {
        id: string;
        name: string;
        email: string | null;
        provider: string;
        __typename: string;
      };
      __typename: string;
    }[];
    __typename: string;
  };
  metadata: {
    ages: (number | null)[] | null;
    __typename: string;
  };
  latestSnapshot: {
    size: number;
    summary: {
      modalities: string[];
      secondaryModalities: string[];
      sessions: string[];
      subjects: string[];
      subjectMetadata:
        | {
            participantId: string;
            age: number | null;
            sex: string | null;
            group: string | null;
            __typename: string;
          }[]
        | null;
      tasks: string[];
      size: number;
      totalFiles: number;
      dataProcessed: boolean;
      pet: any;
      __typename: string;
    };
    issues: {
      severity: string;
      __typename: string;
    }[];
    description: {
      Name: string;
      Authors: string[];
      __typename: string;
    };
    __typename: string;
  };
  analytics: {
    views: number;
    downloads: number;
    __typename: string;
  };
  stars: any[];
  followers: {
    userId: string;
    datasetId: string;
    __typename: string;
  }[];
  snapshots: {
    id: string;
    created: string;
    tag: string;
    __typename: string;
  }[];
  __typename: string;
};

type DatasetEdge = {
  id: string;
  node: OpenNeuroDataset;
  __typename: string;
};

type DatasetData = {
  datasets: {
    edges: DatasetEdge[];
  };
};

type GraphQLResponse = {
  data: DatasetData;
};

const fetchONDatasets = async (
  searchText: string,
): Promise<OpenNeuroDataset[]> => {
  const keywords = searchText
    .split(" ")
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0);
  const queryExample = `query advancedSearchDatasets($query: JSON!, $cursor: String, $allDatasets: Boolean, $datasetType: String, $datasetStatus: String, $sortBy: JSON) {\\n  datasets: advancedSearch(\\n    query: $query\\n    allDatasets: $allDatasets\\n    datasetType: $datasetType\\n    datasetStatus: $datasetStatus\\n    sortBy: $sortBy\\n    first: 25\\n    after: $cursor\\n  ) {\\n    edges {\\n      id\\n      node {\\n        id\\n        created\\n        uploader {\\n          id\\n          name\\n          orcid\\n          __typename\\n        }\\n        public\\n        permissions {\\n          id\\n          userPermissions {\\n            userId\\n            level\\n            access: level\\n            user {\\n              id\\n              name\\n              email\\n              provider\\n              __typename\\n            }\\n            __typename\\n          }\\n          __typename\\n        }\\n        metadata {\\n          ages\\n          __typename\\n        }\\n        latestSnapshot {\\n          size\\n          summary {\\n            modalities\\n            secondaryModalities\\n            sessions\\n            subjects\\n            subjectMetadata {\\n              participantId\\n              age\\n              sex\\n              group\\n              __typename\\n            }\\n            tasks\\n            size\\n            totalFiles\\n            dataProcessed\\n            pet {\\n              BodyPart\\n              ScannerManufacturer\\n              ScannerManufacturersModelName\\n              TracerName\\n              TracerRadionuclide\\n              __typename\\n            }\\n            __typename\\n          }\\n          issues {\\n            severity\\n            __typename\\n          }\\n          description {\\n            Name\\n            Authors\\n            __typename\\n          }\\n          __typename\\n        }\\n        analytics {\\n          views\\n          downloads\\n          __typename\\n        }\\n        stars {\\n          userId\\n          datasetId\\n          __typename\\n        }\\n        followers {\\n          userId\\n          datasetId\\n          __typename\\n        }\\n        snapshots {\\n          id\\n          created\\n          tag\\n          __typename\\n        }\\n        __typename\\n      }\\n      __typename\\n    }\\n    pageInfo {\\n      startCursor\\n      endCursor\\n      hasPreviousPage\\n      hasNextPage\\n      count\\n      __typename\\n    }\\n    __typename\\n  }\\n}`;
  let query = `query advancedSearchDatasets(
  $query: JSON!,
  $cursor: String,
  $allDatasets: Boolean,
  $datasetType: String,
  $datasetStatus: String,
  $sortBy: JSON
) {
  datasets: advancedSearch(
    query: $query,
    allDatasets: $allDatasets,
    datasetType: $datasetType,
    datasetStatus: $datasetStatus,
    sortBy: $sortBy,
    first: 25,
    after: $cursor
  ) {
    edges {
      id
      node {
        id
        created
        uploader {
          id
          name
          orcid
          __typename
        }
        public
        permissions {
          id
          userPermissions {
            userId
            level
            access: level
            user {
              id
              name
              email
              provider
              __typename
            }
            __typename
          }
          __typename
        }
        metadata {
          ages
          __typename
        }
        latestSnapshot {
          size
          summary {
            modalities
            secondaryModalities
            sessions
            subjects
            subjectMetadata {
              participantId
              age
              sex
              group
              __typename
            }
            tasks
            size
            totalFiles
            dataProcessed
            pet {
              BodyPart
              ScannerManufacturer
              ScannerManufacturersModelName
              TracerName
              TracerRadionuclide
              __typename
            }
            __typename
          }
          issues {
            severity
            __typename
          }
          description {
            Name
            Authors
            __typename
          }
          __typename
        }
        analytics {
          views
          downloads
          __typename
        }
        stars {
          userId
          datasetId
          __typename
        }
        followers {
          userId
          datasetId
          __typename
        }
        snapshots {
          id
          created
          tag
          __typename
        }
        __typename
      }
      __typename
    }
    pageInfo {
      startCursor
      endCursor
      hasPreviousPage
      hasNextPage
      count
      __typename
    }
    __typename
  }
}`;
  query = query.split("\n").join("\\n");

  const qq =
    keywords.length > 0
      ? {
          bool: {
            must: [
              {
                simple_query_string: {
                  query: keywords.join(" + ") + "~",
                  fields: [
                    "id^20",
                    "latestSnapshot.readme",
                    "latestSnapshot.description.Name^6",
                    "latestSnapshot.description.Authors^3",
                  ],
                },
              },
            ],
          },
        }
      : {
          bool: {},
        };

  const resp = await fetch("https://openneuro.org/crn/graphql", {
    headers: {
      "content-type": "application/json",
    },
    body: `{"operationName":"advancedSearchDatasets","variables":{"query":${JSON.stringify(qq)},"sortBy":{"created":"desc"},"allDatasets":false,"datasetType":"All Public","datasetStatus":null},"query":"${query}"}`,
    method: "POST",
  });
  if (!resp.ok) {
    throw new Error("Failed to fetch OpenNeuro datasets");
  }
  const graphQLResponse: GraphQLResponse = await resp.json();
  return graphQLResponse.data.datasets.edges.map((edge) => edge.node);
};

type SearchBarProps = {
  width: number;
  height: number;
  onSearch: (searchText: string) => void;
};

const SearchBar: FunctionComponent<SearchBarProps> = ({
  width,
  height,
  onSearch,
}) => {
  const [searchText, setSearchText] = useState<string>("");
  const searchButtonWidth = height;

  return (
    <div style={{ paddingLeft: 15 }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: searchButtonWidth,
          height,
        }}
      >
        <SearchButton
          width={searchButtonWidth}
          height={height}
          onClick={() => onSearch(searchText)}
        />
      </div>

      <div
        style={{
          position: "absolute",
          left: searchButtonWidth,
          top: 0,
          width: width - searchButtonWidth,
          height,
        }}
      >
        <input
          style={{
            width: width - 40 - searchButtonWidth,
            height: 30,
            fontSize: 20,
            padding: 5,
          }}
          type="text"
          placeholder="Search OpenNeuro"
          onChange={(e) => setSearchText(e.target.value)}
          // when enter is pressed
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSearch(searchText);
            }
          }}
          // do not spell check
          spellCheck={false}
        />
      </div>
    </div>
  );
};

type SearchButtonProps = {
  onClick: () => void;
  width: number;
  height: number;
};

const SearchButton: FunctionComponent<SearchButtonProps> = ({
  onClick,
  width,
  height,
}) => {
  return <SmallIconButton icon={<Search />} label="" fontSize={height - 5} />;
};

export default OpenNeuroBrowser;
