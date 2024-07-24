import { FunctionComponent, useCallback, useMemo, useState } from "react";
import { useDandiAssetContext } from "../DandiAssetContext";
import { Hyperlink } from "@fi-sci/misc";
import DendroLinksView from "../DendroLinksView/DendroLinksView";

type DendroViewProps = {
  width: number;
  height: number;
};

const DendroView: FunctionComponent<DendroViewProps> = ({ width, height }) => {
  // const {assetUrl, dandisetId, dandisetVersion, assetPath, associatedDendroProjects} = useDandiAssetContext()

  // const staging = assetUrl.startsWith('https://api-staging.dandiarchive.org')
  // const dandisetInfo = useDandisetInfo(dandisetId, dandisetVersion, staging)

  const { assetUrl, dandisetId, dandisetVersion, assetPath } =
    useDandiAssetContext();

  const handleExportToDendro = useCallback(() => {
    const assetPathEncoded = encodeURIComponent(assetPath || "");
    const url = `https://dendro.vercel.app/importDandiAsset?projectName=D-${dandisetId}&dandisetId=${dandisetId}&dandisetVersion=${dandisetVersion}&assetPath=${assetPathEncoded}&assetUrl=${assetUrl}`;
    window.open(url, "_blank");
  }, [dandisetId, dandisetVersion, assetPath, assetUrl]);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        overflowY: "auto",
      }}
    >
      <div>&nbsp;</div>
      <AssociatedDendroProjectsComponent assetUrl={assetUrl} />
      <div>&nbsp;</div>
      <hr />
      <div>&nbsp;</div>
      <DendroLinksView />
      <hr />
      {dandisetId && dandisetVersion && assetPath && (
        <div>
          <Hyperlink onClick={handleExportToDendro}>Export to Dendro</Hyperlink>
        </div>
      )}
      <div>&nbsp;</div>
    </div>
  );
};

type AssociatedDendroProjectsComponentProps = {
  assetUrl: string;
};

const AssociatedDendroProjectsComponent: FunctionComponent<
  AssociatedDendroProjectsComponentProps
> = ({ assetUrl }) => {
  const { associatedDendroProjects } = useDandiAssetContext();
  const [expanded, setExpanded] = useState(false);
  const initialNumProjectsToShow = 6;
  const projectsFiltered = useMemo(() => {
    if (!associatedDendroProjects) return [];
    if (expanded) return associatedDendroProjects;
    else return associatedDendroProjects.slice(0, initialNumProjectsToShow);
  }, [associatedDendroProjects, expanded]);
  if (!projectsFiltered) return <span>...</span>;
  if (projectsFiltered.length === 0) {
    return <div>This NWB file has no associated Dendro projects.</div>;
  }
  return (
    <div>
      <span>Associated Dendro projects:&nbsp; </span>
      {projectsFiltered.map((project, i) => (
        <span key={project.projectId}>
          <span style={{ whiteSpace: "nowrap" }}>
            <Hyperlink
              href={`https://dendro.vercel.app/project/${project.projectId}`}
              target="_blank"
            >
              {project.name}
              &nbsp;({formatUserId(project.ownerId)})
            </Hyperlink>
          </span>
          {i < projectsFiltered.length - 1 && <span>&nbsp;|&nbsp; </span>}
        </span>
      ))}
      {!expanded &&
        associatedDendroProjects &&
        associatedDendroProjects.length > initialNumProjectsToShow && (
          <span>
            &nbsp;|&nbsp;...&nbsp;
            <span style={{ whiteSpace: "nowrap" }}>
              <Hyperlink onClick={() => setExpanded(true)}>Show all</Hyperlink>
            </span>
          </span>
        )}
    </div>
  );
};

export const formatUserId = (userId: string) => {
  if (userId.startsWith("github|")) {
    return userId.slice("github|".length);
  } else {
    return userId;
  }
};

export default DendroView;
