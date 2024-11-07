/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  FunctionComponent,
  useCallback,
  useReducer,
  useRef,
  useState,
} from "react";
import pako from "pako";
import jp from "jsonpath";
// import {JSONPath} from "jsonpath-plus" // had problems with this
import { Hyperlink } from "@fi-sci/misc";
import ModalWindow, { useModalWindow } from "@fi-sci/modal-window";
import QueryHintsView from "./QueryHintsView";
import useRoute from "neurosift-lib/contexts/useRoute";
import Splitter from "neurosift-lib/components/Splitter"

type JsonPathQueryComponentProps = {
  width: number;
  height: number;
  dandisetIdVersions: string[];
};

type QueryResultsState = {
  dandisetId: string;
  dandisetVersion: string;
  assetId: string;
  assetPath: string;
  results: string[];
}[];
type QueryResultsAction =
  | {
      type: "clear";
    }
  | {
      type: "add";
      value: {
        dandisetId: string;
        dandisetVersion: string;
        assetId: string;
        assetPath: string;
        results: string[];
      };
    };

const queryResultsReducer = (
  state: QueryResultsState,
  action: QueryResultsAction,
): QueryResultsState => {
  switch (action.type) {
    case "clear":
      return [];
    case "add":
      return [...state, action.value];
    default:
      return state;
  }
};

const JsonPathQueryComponent: FunctionComponent<
  JsonPathQueryComponentProps
> = ({ width, height, dandisetIdVersions }) => {
  const [jsonPathQuery, setJsonPathQuery] = useState<string>("");
  const [queryResults, queryResultsDispatch] = useReducer(
    queryResultsReducer,
    [],
  );
  const [runningQuery, setRunningQuery] = useState<boolean>(false);
  const canceled = useRef<boolean>(false);

  const handleQuery = useCallback(async () => {
    if (runningQuery) return;
    setRunningQuery(true);
    canceled.current = false;

    queryResultsDispatch({ type: "clear" });

    for (const dandisetIdVersion of dandisetIdVersions) {
      const dandisetId = dandisetIdVersion.split("@")[0];
      const dandisetVersion = dandisetIdVersion.split("@")[1];
      const url = `https://lindi.neurosift.org/dandi/nwb_meta/${dandisetId}.json.gz`;
      try {
        const x = await loadJsonGz(url);
        let timer = Date.now();
        for (const f of x.files) {
          if (canceled.current) break;
          const rr = queryDandisetFile(f, jsonPathQuery, true);
          if (rr.length > 0) {
            queryResultsDispatch({
              type: "add",
              value: {
                dandisetId,
                dandisetVersion,
                assetId: f.asset_id,
                assetPath: f.asset_path,
                results: rr,
              },
            });
          }
          const elapsed = Date.now() - timer;
          if (elapsed > 500) {
            await new Promise((resolve) => setTimeout(resolve, 1));
            timer = Date.now();
          }
        }
        if (canceled.current) break;
      } catch (e) {
        console.error(e);
      }
    }

    setRunningQuery(false);
  }, [runningQuery, dandisetIdVersions, jsonPathQuery]);

  const { setRoute } = useRoute();

  if (dandisetIdVersions.length === 0)
    return <div style={{ padding: 20 }}>Select at least one Dandiset.</div>;
  if (dandisetIdVersions.length > 200)
    return (
      <div style={{ padding: 20 }}>
        Cannot select more than 200 Dandisets ({dandisetIdVersions.length}{" "}
        selected). Please refine your search.
      </div>
    );
  return (
    <Splitter
      direction="horizontal"
      width={width}
      height={height}
      initialPosition={Math.min(600, Math.max(200, width / 2))}
    >
      <LeftPanel
        width={0}
        height={0}
        jsonPathQuery={jsonPathQuery}
        setJsonPathQuery={setJsonPathQuery}
        onQuery={handleQuery}
        runningQuery={runningQuery}
        canceled={canceled}
      />
      <RightPanel
        width={0}
        height={0}
        queryResults={queryResults}
        setRoute={setRoute}
      />
    </Splitter>
  );
};

type LeftPanelProps = {
  width: number;
  height: number;
  jsonPathQuery: string;
  setJsonPathQuery: (value: string) => void;
  onQuery: () => void;
  runningQuery: boolean;
  canceled: React.MutableRefObject<boolean>;
};

const LeftPanel: FunctionComponent<LeftPanelProps> = ({
  width,
  height,
  jsonPathQuery,
  setJsonPathQuery,
  onQuery,
  runningQuery,
  canceled,
}) => {
  const {
    handleOpen: openHints,
    handleClose: closeHints,
    visible: hintsVisible,
  } = useModalWindow();

  const textAreaHeight = Math.max(100, height - 150);

  return (
    <div
      style={{
        position: "absolute",
        left: 10,
        top: 10,
        width: width - 20,
        height: height - 20,
        overflowY: "auto",
      }}
    >
      <div>
        <Hyperlink onClick={openHints}>See example queries</Hyperlink>
      </div>
      <div>&nbsp;</div>
      <div>
        <textarea
          value={jsonPathQuery}
          onChange={(e) => setJsonPathQuery(e.target.value)}
          style={{
            width: width - 30,
            height: textAreaHeight,
            fontFamily: "monospace",
          }}
          spellCheck={false}
        />
        <button disabled={runningQuery} onClick={onQuery}>
          Submit query
        </button>
        &nbsp;
        {runningQuery && (
          <button
            onClick={() => {
              canceled.current = true;
            }}
          >
            Cancel
          </button>
        )}
      </div>
      <ModalWindow visible={hintsVisible} onClose={closeHints}>
        <QueryHintsView />
      </ModalWindow>
    </div>
  );
};

type RightPanelProps = {
  width: number;
  height: number;
  queryResults: QueryResultsState;
  setRoute: (route: any) => void;
};

const RightPanel: FunctionComponent<RightPanelProps> = ({
  width,
  height,
  queryResults,
  setRoute,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        left: 10,
        top: 10,
        width: width - 20,
        height: height - 20,
        overflowY: "auto",
      }}
    >
      <table className="nwb-table">
        <thead>
          <tr>
            <th>Dandiset ID</th>
            <th>Asset Path</th>
            <th>Results</th>
          </tr>
        </thead>
        <tbody>
          {queryResults.map((result, i) => (
            <tr key={i}>
              <td>{result.dandisetId}</td>
              <td>
                <Hyperlink
                  onClick={() => {
                    const url = `https://api.dandiarchive.org/api/assets/${result.assetId}/download/`;
                    setRoute({
                      page: "nwb",
                      dandisetId: result.dandisetId,
                      dandisetVersion: result.dandisetVersion,
                      url: [url],
                      storageType: [],
                    });
                  }}
                >
                  {result.assetPath}
                </Hyperlink>
              </td>
              <td>
                {result.results.map((r, j) => (
                  <div key={j}>{r.length < 10000 ? r : "<too-large>"}</div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

type DandisetFileNwbMeta = {
  asset_id: string;
  asset_path: string;
  dandiset_id: string;
  dandiset_version: string;
  nwb_meta: {
    generationMetadata: any;
    refs: {
      [key: string]: any;
    };
    version: number;
  };
};

const queryDandisetFile = (
  f: DandisetFileNwbMeta,
  jsonPathQuery: string,
  unique: boolean,
): string[] => {
  const lines = jsonPathQuery.split("\n").filter((l) => !l.startsWith("//"));
  jsonPathQuery = lines.join("\n");
  const root = {};
  for (const k in f.nwb_meta.refs) {
    if (k.endsWith(".zattrs")) {
      const attrs = f.nwb_meta.refs[k];
      const a = createItem(root, parentPath(k));
      a.attrs = attrs;
    } else if (k.endsWith(".zarray")) {
      const arr = f.nwb_meta.refs[k];
      const a = createItem(root, parentPath(k));
      a._zarray = arr;
    }
  }
  if (jsonPathQuery.includes("return ")) {
    const groups: [string, any][] = [];
    const joinKey = (a: string, b: string): string => {
      if (a === "") return b;
      if (b === "") return a;
      return a + "/" + b;
    };
    const collectGroups = (key: string, o: any): any => {
      if (!o) return;
      if (typeof o !== "object") return;
      if (!o._zarray) {
        // not an array
        groups.push([key, o]);
        for (const k in o) {
          if (k === "attrs") continue;
          collectGroups(joinKey(key, k), o[k]);
        }
      }
    };
    collectGroups("", root);
    // we want to evaluate the javascript in the jsonPathQuery
    // with groups as a variable, and return the results
    // eslint-disable-next-line no-new-func
    const func = Function("groups", jsonPathQuery);
    const results = func(groups);
    let ret = results.map((r: any) => JSON.stringify(r));
    if (unique) {
      ret = [...new Set(ret)].sort();
    }
    return ret;
  } else {
    const results = jp.query(root, jsonPathQuery);
    // const results = JSONPath({path: jsonPathQuery, json: root})
    let ret = results.map((r: any) => JSON.stringify(r));
    if (unique) {
      ret = [...new Set(ret)].sort();
    }
    return ret;
  }
};

const createItem = (obj: any, path: string): any => {
  const parts = path.split("/");
  let o = obj;
  for (const part of parts) {
    if (part) {
      if (!o[part])
        o[part] = {
          attrs: {},
        };
      o = o[part];
    }
  }
  return o;
};

const parentPath = (path: string): string => {
  const i = path.lastIndexOf("/");
  if (i < 0) return "";
  return path.slice(0, i);
};

const loadJsonGz = async (url: string): Promise<any> => {
  const response = await fetch(url);
  if (response.status !== 200) return null;
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const inflated = pako.inflate(bytes, { to: "string" });
  return JSON.parse(inflated);
};

export default JsonPathQueryComponent;
