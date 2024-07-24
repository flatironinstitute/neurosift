import { Hyperlink } from "@fi-sci/misc";
import { FunctionComponent, useEffect, useMemo, useState } from "react";
import { DendroFile, DendroJob } from "../../../dendro/dendro-types";
import {
  AssociatedDendroProject,
  useDandiAssetContext,
} from "../DandiAssetContext";
import { formatUserId } from "../NwbMainView/NwbMainLeftPanel";
import { useNwbFile } from "../NwbFileContext";

type DendroLinksViewProps = {
  // none
};

const useDendroProject = (projectId: string) => {
  const filesUrl = `https://dendro.vercel.app/api/gui/projects/${projectId}/files`;
  const jobsUrl = `https://dendro.vercel.app/api/gui/projects/${projectId}/jobs`;
  const [files, setFiles] = useState<DendroFile[] | undefined>(undefined);
  const [jobs, setJobs] = useState<DendroJob[] | undefined>(undefined);

  useEffect(() => {
    fetch(filesUrl)
      .then((response) => response.json())
      .then((data) => setFiles(data.files));
  }, [filesUrl]);

  useEffect(() => {
    fetch(jobsUrl)
      .then((response) => response.json())
      .then((data) => setJobs(data.jobs));
  }, [jobsUrl]);

  return { files, jobs };
};

const getDerivedOutputFiles = (
  files: DendroFile[] | undefined,
  jobs: DendroJob[] | undefined,
  inputFile: DendroFile | undefined,
  visited: { [key: string]: boolean },
) => {
  if (!files) return [];
  if (!jobs) return [];
  if (!inputFile) return [];
  if (visited[inputFile.fileName]) return [];
  visited[inputFile.fileName] = true;

  const ret: DendroFile[] = [];

  const inputFileName = inputFile.fileName;
  const jobsWithInput = jobs.filter((job) =>
    job.inputFiles.find((a) => a.fileName === inputFileName),
  );
  for (const job of jobsWithInput) {
    for (const output of job.outputFiles) {
      const outputFile = files.find((a) => a.fileName === output.fileName);
      if (outputFile) {
        ret.push(outputFile);
        const a = getDerivedOutputFiles(files, jobs, outputFile, visited);
        ret.push(...a);
      }
    }
  }
  return ret;
};

const DendroLinksView: FunctionComponent<DendroLinksViewProps> = () => {
  const { associatedDendroProjects } = useDandiAssetContext();
  if (!associatedDendroProjects) return <span>...</span>;
  if (associatedDendroProjects.length === 0) return <span />;
  return (
    <div>
      {associatedDendroProjects.map((project, i) => (
        <DendroLinksViewForProject key={i} project={project} />
      ))}
    </div>
  );
};

const DendroLinksViewForProject: FunctionComponent<{
  project: AssociatedDendroProject;
}> = ({ project }) => {
  const nwbFile = useNwbFile();
  const nwbFileUrls = nwbFile.getUrls();
  const nwbFileUrl = nwbFileUrls[0] || undefined;
  const { files, jobs } = useDendroProject(project.projectId);
  const inputFile = useMemo(
    () => files?.find((a) => a.content === `url:${nwbFileUrl}`),
    [files, nwbFileUrl],
  );
  const derivedOutputFiles = useMemo(
    () =>
      getDerivedOutputFiles(files, jobs, inputFile, {}).filter((a) =>
        a.fileName.endsWith(".nh5"),
      ),
    [files, jobs, inputFile],
  );
  const hasSomething = derivedOutputFiles.length > 0;
  if (!hasSomething) return <span />;
  return (
    <div>
      Dendro {project.name} ({formatUserId(project.ownerId)}):&nbsp;
      {derivedOutputFiles.map((outputFile, i) => (
        <span key={i}>
          {outputFile.content === "pending" ? (
            <span style={{ color: "gray" }}>
              {baseNameWithoutExtension(outputFile.fileName)} (pending)
            </span>
          ) : outputFile.content.startsWith("url:") ? (
            <Hyperlink href={getFigurlForNh5(outputFile)} target="_blank">
              {baseNameWithoutExtension(outputFile.fileName)}
            </Hyperlink>
          ) : (
            <span style={{ color: "red" }}>
              {baseNameWithoutExtension(outputFile.fileName)} (unexpected
              content)
            </span>
          )}
          &nbsp;
          {i < derivedOutputFiles.length - 1 ? " | " : ""}
          &nbsp;
        </span>
      ))}
    </div>
  );
};

const baseNameWithoutExtension = (path: string) => {
  const parts = path.split("/");
  const fileName = parts[parts.length - 1];
  const parts2 = fileName.split(".");
  return parts2.slice(0, parts2.length - 1).join(".");
};

const figurlDandiVisUrl = "npm://@fi-sci/figurl-dandi-vis@0.1/dist";

const getFigurlForNh5 = (outputFile: DendroFile) => {
  const url = outputFile.content.startsWith("url:")
    ? outputFile.content.slice("url:".length)
    : undefined;
  if (!url) return undefined;
  const d = {
    nh5: url,
  };
  const dJson = JSON.stringify(d);
  const dJsonEncoded = encodeURI(dJson);
  const labelEncoded = encodeURI(outputFile.fileName);
  return `https://figurl.org/f?v=${figurlDandiVisUrl}&d=${dJsonEncoded}&label=${labelEncoded}`;
};

export default DendroLinksView;
