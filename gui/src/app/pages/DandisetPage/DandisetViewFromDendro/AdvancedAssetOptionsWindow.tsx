import { FunctionComponent, useCallback, useState } from "react";

type AdvancedAssetOptionsWindowProps = {
  selectedAssets: {
    assetPaths: string[];
  };
  dandisetId: string;
  dandisetVersion: string;
  useStaging: boolean;
  onClose: () => void;
};

const AdvancedAssetOptionsWindow: FunctionComponent<
  AdvancedAssetOptionsWindowProps
> = ({ selectedAssets, dandisetId, dandisetVersion, useStaging, onClose }) => {
  const [deleting, setDeleting] = useState(false);
  return (
    <div>
      <h3>
        Advanced options for selected assets in Dandiset {dandisetId}{" "}
        {useStaging ? "(staging)" : ""}
      </h3>
      <div>
        <table className="nwb-table">
          <thead>
            <tr>
              <th>Asset path</th>
            </tr>
          </thead>
          <tbody>
            {selectedAssets.assetPaths.map((assetPath, index) => {
              return (
                <tr key={index}>
                  <td>{assetPath}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <hr />
      <div>
        {deleting ? (
          <DeleteSelectedAssetsComponent
            assetPaths={selectedAssets.assetPaths}
            dandisetId={dandisetId}
            dandisetVersion={dandisetVersion}
            useStaging={useStaging}
            onClose={() => {
              setDeleting(false);
              onClose();
            }}
          />
        ) : useStaging ? (
          dandisetVersion === "draft" ? (
            <button onClick={() => setDeleting(true)}>
              Delete selected assets
            </button>
          ) : (
            <span>
              You can only delete assets from the draft version of a Dandiset
            </span>
          )
        ) : (
          <span>
            At this time, deletion is only an option for staging Dandisets
          </span>
        )}
      </div>
    </div>
  );
};

type DeleteSelectedAssetsComponentProps = {
  assetPaths: string[];
  dandisetId: string;
  dandisetVersion: string;
  useStaging: boolean;
  onClose: () => void;
};

const DeleteSelectedAssetsComponent: FunctionComponent<
  DeleteSelectedAssetsComponentProps
> = ({ assetPaths, dandisetId, dandisetVersion, useStaging, onClose }) => {
  const [dandiApiKey, setDandiApiKey] = useState("");
  const handleDelete = useCallback(async () => {
    const okay = window.confirm(
      `Are you sure you want to delete these ${assetPaths.length} assets from Dandiset ${dandisetId}?`,
    );
    if (!okay) {
      return;
    }
    await deleteAssets({
      dandiApiKey,
      assetPaths,
      dandisetId,
      dandisetVersion,
      useStaging,
    });
    onClose();
  }, [
    dandiApiKey,
    assetPaths,
    dandisetId,
    dandisetVersion,
    useStaging,
    onClose,
  ]);
  return (
    <div>
      <table>
        <tbody>
          <tr>
            <td>DANDI API key{useStaging ? " (staging)" : ""}</td>
            <td>
              <input
                type="text"
                value={dandiApiKey}
                onChange={(e) => setDandiApiKey(e.target.value)}
              />
            </td>
          </tr>
        </tbody>
      </table>
      <div>
        <button onClick={handleDelete}>Delete selected assets</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
};

const deleteAssets = async (o: {
  dandiApiKey: string;
  assetPaths: string[];
  dandisetId: string;
  dandisetVersion: string;
  useStaging: boolean;
}) => {
  const { dandiApiKey, assetPaths, dandisetId, dandisetVersion, useStaging } =
    o;
  try {
    for (const assetPath of assetPaths) {
      await deleteAsset({
        dandiApiKey,
        assetPath,
        dandisetId,
        dandisetVersion,
        useStaging,
      });
    }
  } catch (e: any) {
    alert(`Error deleting assets: ${e.message}`);
    throw e;
  }
};

const deleteAsset = async (o: {
  dandiApiKey: string;
  assetPath: string;
  dandisetId: string;
  dandisetVersion: string;
  useStaging: boolean;
}) => {
  const { dandiApiKey, assetPath, dandisetId, dandisetVersion, useStaging } = o;
  if (!useStaging) {
    throw new Error(
      "At this time, deletion is only supported for staging Dandisets",
    );
  }
  await removeAsset({
    dandiApiKey,
    dandisetId,
    dandisetVersion,
    path: assetPath,
  });
};

const removeAsset = async (o: {
  dandiApiKey: string;
  dandisetId: string;
  dandisetVersion: string;
  path: string;
}) => {
  const { dandiApiKey, dandisetId, dandisetVersion, path } = o;
  const assetId = await getAssetIdForPath({
    dandiApiKey,
    dandisetId,
    dandisetVersion,
    path,
  });
  const url = `https://api-staging.dandiarchive.org/api/dandisets/${dandisetId}/versions/${dandisetVersion}/assets/${assetId}/`;
  const headers = {
    accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `token ${dandiApiKey}`,
  };
  try {
    const response = await fetch(url, { method: "DELETE", headers });
    if (!response.ok) {
      throw new Error(`Error removing asset ${path}: ${response.statusText}`);
    }
  } catch (e: any) {
    console.warn(e);
    console.warn(
      "It seems that the DELETE request has failed. But it seems that the delete actually happens anyway. So, we are ignoring this error. We should report this to the DANDI team. It may be a CORS issue. The way to debug is to intercept the call and try to do it from curl.",
    );
  }
};

const getAssetIdForPath = async (o: {
  dandiApiKey: string;
  dandisetId: string;
  dandisetVersion: string;
  path: string;
}) => {
  const { dandiApiKey, dandisetId, dandisetVersion, path } = o;
  const pageSize = 1000;
  const pathPrefix = _getPathPrefix(path);
  const url = `https://api-staging.dandiarchive.org/api/dandisets/${dandisetId}/versions/${dandisetVersion}/assets/paths/?page=1&page_size=${pageSize}&path_prefix=${pathPrefix}`;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const headers = {
      accept: "application/json",
      Authorization: `token ${dandiApiKey}`,
    };
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(
        `Error fetching asset ID for path ${path}: ${response.statusText}`,
      );
    }
    const rr = await response.json();
    const next = rr.next;
    const results = rr.results;
    for (const result of results) {
      if (result.path === path) {
        const asset = result.asset;
        if (!asset) {
          throw new Error(
            `Asset for path ${path} not found in dandiset ${dandisetId}`,
          );
        }
        return asset.asset_id;
      }
    }
    if (!next) {
      throw new Error(`Asset ${path} not found in dandiset ${dandisetId}`);
    }
  }
};

const _getPathPrefix = (path: string) => {
  const parts = path.split("/");
  if (parts.length === 1) {
    return "";
  }
  return parts.slice(0, -1).join("/");
};

export default AdvancedAssetOptionsWindow;
