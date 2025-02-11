import { FunctionComponent, useEffect, useMemo, useState } from "react";
import { formatBytes } from "@shared/util/formatBytes";
import { useParams, useNavigate } from "react-router-dom";
import {
  AssetsResponseItem,
  DandisetSearchResultItem,
  DandisetVersionInfo,
} from "../DandiPage/dandi-types";
import { addRecentDandiset } from "../util/recentDandisets";
import { useDandisetVersionInfo } from "./useDandisetVersionInfo";
import useQueryAssets from "./useQueryAssets";
import useQueryDandiset from "./useQueryDandiset";
import ScrollY from "@components/ScrollY";

type DandisetPageProps = {
  width: number;
  height: number;
};

const DandisetPage: FunctionComponent<DandisetPageProps> = ({
  width,
  height,
}) => {
  const { dandisetId } = useParams();
  const navigate = useNavigate();
  const staging = false;
  const dandisetResponse: DandisetSearchResultItem | undefined | null =
    useQueryDandiset(dandisetId, staging);

  // todo: get dandisetVersion from the route
  const dandisetVersion = "";

  const dandisetVersionInfo: DandisetVersionInfo | null =
    useDandisetVersionInfo(
      dandisetId,
      dandisetVersion || "",
      staging,
      dandisetResponse || null,
    );

  // todo: set dandisetVersion to route if not there yet

  const [maxNumPages] = useState(1);
  const [nwbFilesOnly, setNwbFilesOnly] = useState(false);
  const { assetsResponses, incomplete } = useQueryAssets(
    dandisetId,
    maxNumPages,
    dandisetResponse || null,
    dandisetVersionInfo,
    staging,
    nwbFilesOnly,
  );
  const allAssets: AssetsResponseItem[] | null = useMemo(() => {
    if (!assetsResponses) return null;
    const rr: AssetsResponseItem[] = [];
    assetsResponses.forEach((assetsResponse) => {
      rr.push(...assetsResponse.results);
    });
    return rr;
  }, [assetsResponses]);

  useEffect(() => {
    if (dandisetId) {
      addRecentDandiset(dandisetId);
    }
  }, [dandisetId, staging]);

  if (!dandisetResponse || !dandisetVersionInfo) {
    return <div>Loading...</div>;
  }

  return (
    <ScrollY width={width} height={height}>
      <div style={{ padding: "20px" }}>
        <div style={{ marginBottom: "15px" }}>
          <span
            onClick={() => navigate("/dandi")}
            style={{
              cursor: "pointer",
              color: "#0066cc",
              fontSize: "14px",
            }}
          >
            ← Back to DANDI
          </span>
        </div>
        <h1>{dandisetVersionInfo.metadata.name}</h1>

        <div style={{ marginTop: "15px" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "20px",
              color: "#666",
            }}
          >
            <span>ID: {dandisetId}</span>
            <span>Version: {dandisetVersionInfo.version}</span>
            <span>
              Created:{" "}
              {new Date(dandisetVersionInfo.created).toLocaleDateString()}
            </span>
            <span>Status: {dandisetVersionInfo.status}</span>
            <a
              href={`https://dandiarchive.org/dandiset/${dandisetId}/${dandisetVersionInfo.version}`}
              style={{ color: "#0066cc", textDecoration: "none" }}
            >
              View on DANDI
            </a>
          </div>
        </div>

        <div style={{ marginTop: "15px" }}>
          <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>
            {dandisetVersionInfo.metadata.description}
          </p>
        </div>

        <div
          style={{
            marginTop: "15px",
            display: "flex",
            gap: "6px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <strong>Contributors:</strong>
          {dandisetVersionInfo.metadata.contributor.map(
            (contributor, index) => (
              <span key={index}>
                {contributor.name}
                {index < dandisetVersionInfo.metadata.contributor.length - 1 &&
                  ", "}
              </span>
            ),
          )}
        </div>

        <div style={{ marginTop: "20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "10px",
            }}
          >
            <h2 style={{ margin: 0 }}>
              Assets {incomplete && "(showing partial list)"}
            </h2>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={nwbFilesOnly}
                onChange={(e) => setNwbFilesOnly(e.target.checked)}
              />
              Show NWB files only
            </label>
          </div>
          <div style={{ marginBottom: "10px" }}>
            Total files:{" "}
            {dandisetVersionInfo.metadata.assetsSummary.numberOfFiles}
            {" | "}
            Total size:{" "}
            {formatBytes(
              dandisetVersionInfo.metadata.assetsSummary.numberOfBytes,
            )}
          </div>
          {allAssets ? (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "#f5f5f5",
                    borderBottom: "1px solid #ccc",
                  }}
                >
                  <th style={{ padding: "8px", textAlign: "left" }}>
                    File Path
                  </th>
                  <th
                    style={{
                      padding: "8px",
                      textAlign: "right",
                      width: "120px",
                    }}
                  >
                    Modified
                  </th>
                  <th
                    style={{
                      padding: "8px",
                      textAlign: "right",
                      width: "100px",
                    }}
                  >
                    Size
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...allAssets]
                  .sort((a, b) => a.path.localeCompare(b.path))
                  .map((asset) => (
                    <tr
                      key={asset.asset_id}
                      style={{ borderBottom: "1px solid #ccc" }}
                    >
                      <td style={{ padding: "8px" }}>
                        <div
                          style={{
                            cursor: asset.path.endsWith(".nwb")
                              ? "pointer"
                              : "default",
                            color: asset.path.endsWith(".nwb")
                              ? "#0066cc"
                              : "inherit",
                          }}
                          onClick={() => {
                            if (asset.path.endsWith(".nwb")) {
                              navigate(
                                `/nwb?url=https://api.dandiarchive.org/api/assets/${asset.asset_id}/download/&dandisetId=${dandisetId}&dandisetVersion=${dandisetVersionInfo.version}`,
                              );
                            }
                          }}
                        >
                          {asset.path}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          textAlign: "right",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {new Date(asset.modified).toLocaleDateString()}
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          textAlign: "right",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatBytes(asset.size)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <div>Loading assets...</div>
          )}
        </div>
      </div>
    </ScrollY>
  );
};

export default DandisetPage;
