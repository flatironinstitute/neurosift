import { useEffect, useMemo, useState } from "react";
import { isUsingLindi } from "./nwbInterface";
import { useNavigate } from "react-router-dom";
import DatasetDataView from "./DatasetDataView";
import { NwbFileOverview } from "./types";
import { DandisetVersionInfo } from "../DandiPage/dandi-types";

type NwbFileOverviewResult = NwbFileOverview | { error: string } | null;

type NwbOverviewProps = {
  nwbFileOverview: NwbFileOverviewResult;
  nwbUrl: string | null;
  dandisetInfo: DandisetVersionInfo | null;
};

const MAX_DESCRIPTION_LENGTH = 150;
const MAX_CONTRIBUTORS_LENGTH = 100;

export const NwbOverview = ({
  nwbFileOverview,
  nwbUrl,
  dandisetInfo,
}: NwbOverviewProps) => {
  const navigate = useNavigate();
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showFullContributors, setShowFullContributors] = useState(false);

  const [, setForceRerender] = useState(false);

  // force rerender after 2 seconds to check if we are using LINDI
  useEffect(() => {
    const timer = setTimeout(() => {
      setForceRerender((prev) => !prev);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const contributors =
    dandisetInfo?.metadata.contributor.map((c) => c.name).join(", ") || "";
  return (
    <div>
      {dandisetInfo && (
        <div style={{ marginBottom: 15, fontSize: "0.8em" }}>
          <h3 style={{ marginBottom: 8 }}>
            Dandiset {dandisetInfo.dandiset.identifier} (v.
            {dandisetInfo.version}) - {dandisetInfo.metadata.name}{" "}
            <span
              style={{
                fontSize: "0.8em",
                color: "#0066cc",
                cursor: "pointer",
                fontWeight: "normal",
              }}
              onClick={() =>
                navigate(`/dandiset/${dandisetInfo.dandiset.identifier}`)
              }
              title="View Dandiset page"
            >
              (view)
            </span>
          </h3>
          <table style={{ width: "100%" }}>
            <tbody>
              <tr>
                <td style={{ verticalAlign: "top" }}>Description</td>
                <td>
                  {showFullDescription
                    ? dandisetInfo.metadata.description
                    : dandisetInfo.metadata.description.slice(
                        0,
                        MAX_DESCRIPTION_LENGTH,
                      )}
                  {dandisetInfo.metadata.description.length >
                    MAX_DESCRIPTION_LENGTH && (
                    <span>
                      {!showFullDescription && "... "}
                      <button
                        onClick={() =>
                          setShowFullDescription(!showFullDescription)
                        }
                        style={{
                          border: "none",
                          background: "none",
                          color: "#0066cc",
                          padding: 0,
                          cursor: "pointer",
                          fontSize: "inherit",
                        }}
                      >
                        {showFullDescription ? "show less" : "read more"}
                      </button>
                    </span>
                  )}
                </td>
              </tr>
              <tr>
                <td style={{ verticalAlign: "top" }}>Contributors</td>
                <td>
                  {showFullContributors
                    ? contributors
                    : contributors.slice(0, MAX_CONTRIBUTORS_LENGTH)}
                  {contributors.length > MAX_CONTRIBUTORS_LENGTH && (
                    <span>
                      {!showFullContributors && "... "}
                      <button
                        onClick={() =>
                          setShowFullContributors(!showFullContributors)
                        }
                        style={{
                          border: "none",
                          background: "none",
                          color: "#0066cc",
                          padding: 0,
                          cursor: "pointer",
                          fontSize: "inherit",
                        }}
                      >
                        {showFullContributors ? "show less" : "read more"}
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {dandisetInfo && (
        <hr
          style={{
            margin: "15px 0",
            border: "none",
            borderTop: "1px solid #ddd",
          }}
        />
      )}
      <div style={{ marginBottom: 8 }}>
        {nwbFileOverview && "error" in nwbFileOverview ? (
          <div style={{ color: "red" }}>{nwbFileOverview.error}</div>
        ) : nwbFileOverview ? (
          <table style={{ fontSize: "0.8em" }}>
            <tbody>
              {nwbFileOverview.items.map((item) => (
                <tr key={item.path}>
                  <td>{item.name}</td>
                  <td>
                    <DatasetDataView
                      nwbFile={nwbUrl}
                      path={item.path}
                      renderer={item.renderer}
                    />
                  </td>
                </tr>
              ))}
              <tr>
                <td>NWB Version</td>
                <td>{nwbFileOverview.nwbVersion}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <span>Loading...</span>
        )}
        {nwbUrl && isUsingLindi(nwbUrl) && (
          <div style={{ marginTop: 12 }}>
            <span
              style={{
                backgroundColor: "#e3f2fd",
                padding: "4px 8px",
                borderRadius: "4px",
                color: "#1976d2",
                fontWeight: "bold",
                fontSize: "0.8em",
              }}
            >
              Using LINDI
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default NwbOverview;
