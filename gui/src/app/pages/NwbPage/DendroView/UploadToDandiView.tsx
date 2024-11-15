import {
  CreateJobRequest,
  DendroJobDefinition,
  DendroJobRequiredResources,
  isCreateJobResponse,
} from "app/dendro/dendro-types";
import { FunctionComponent, useCallback, useMemo, useState } from "react";
import { SelectDendroApiKeyComponent } from "neurosift-lib/viewPlugins/CEBRA/DendroHelpers";

type UploadToDandiViewProps = {
  nwbFileUrl: string;
};

type UploadToDandiOpts = {
  dandisetId: string;
  dandisetVersion: string;
  assetPath: string;
  dandiApiKey: string;
  staging: boolean;
};

const defaultUploadToDandiOpts: UploadToDandiOpts = {
  dandisetId: "",
  dandisetVersion: "",
  assetPath: "",
  dandiApiKey: "",
  staging: true,
};

const UploadToDandiView: FunctionComponent<UploadToDandiViewProps> = ({
  nwbFileUrl,
}) => {
  const [opts, setOpts] = useState<UploadToDandiOpts>(defaultUploadToDandiOpts);
  const [dendroApiKey, setDendroApiKey] = useState<string>("");
  const [visible, setVisible] = useState<boolean>(false);
  const [submittingJob, setSubmittingJob] = useState<boolean>(false);
  const { uploadDisabled, uploadDisabledReason } = useMemo(() => {
    if (!opts.dandisetId) {
      return {
        uploadDisabled: true,
        uploadDisabledReason: "Dandiset ID is required",
      };
    }
    if (!opts.dandisetVersion) {
      return {
        uploadDisabled: true,
        uploadDisabledReason: "Dandiset version is required",
      };
    }
    if (!opts.dandiApiKey) {
      return {
        uploadDisabled: true,
        uploadDisabledReason: "DANDI API key is required",
      };
    }
    if (!opts.assetPath) {
      return {
        uploadDisabled: true,
        uploadDisabledReason: "Asset path is required",
      };
    }
    if (!isValidAssetPath(opts.assetPath)) {
      return {
        uploadDisabled: true,
        uploadDisabledReason: "Invalid asset path",
      };
    }
    if (!opts.staging) {
      return {
        uploadDisabled: true,
        uploadDisabledReason: "For now, only uploads to staging are supported",
      };
    }
    if (!dendroApiKey) {
      return {
        uploadDisabled: true,
        uploadDisabledReason: "Dendro API key is required",
      };
    }
    return { uploadDisabled: false, uploadDisabledReason: "" };
  }, [opts, dendroApiKey]);
  const handleSubmitUploadJob = useCallback(async () => {
    if (submittingJob) return;
    setSubmittingJob(true);
    try {
      await submitJob({
        dandisetId: opts.dandisetId,
        dandisetVersion: opts.dandisetVersion,
        assetPath: opts.assetPath,
        dandiApiKey: opts.dandiApiKey,
        staging: opts.staging,
        nwbFileUrl,
        dendroApiKey,
      });
      alert("Upload job submitted");
    } catch (err: any) {
      alert(`Error submitting job: ${err.message}`);
    } finally {
      setSubmittingJob(false);
    }
  }, [submittingJob, opts, nwbFileUrl, dendroApiKey]);
  return (
    <div>
      <h3>Upload to DANDI</h3>
      <div>
        {!visible && (
          <button onClick={() => setVisible(true)}>Upload to DANDI</button>
        )}
        {visible && (
          <div>
            <table>
              <tbody>
                <tr>
                  <td>Dandiset ID</td>
                  <td>
                    <input
                      type="text"
                      value={opts?.dandisetId || ""}
                      onChange={(e) =>
                        setOpts({
                          ...opts,
                          dandisetId: e.target.value as string,
                        })
                      }
                    />
                  </td>
                </tr>
                <tr>
                  <td>Dandiset version</td>
                  <td>
                    <input
                      type="text"
                      value={opts?.dandisetVersion || ""}
                      onChange={(e) =>
                        setOpts({
                          ...opts,
                          dandisetVersion: e.target.value as string,
                        })
                      }
                    />
                  </td>
                </tr>
                <tr>
                  <td>Asset path</td>
                  <td>
                    <input
                      type="text"
                      value={opts?.assetPath || ""}
                      onChange={(e) =>
                        setOpts({
                          ...opts,
                          assetPath: e.target.value as string,
                        })
                      }
                    />
                  </td>
                </tr>
                <tr>
                  <td>Staging</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={opts?.staging || false}
                      onChange={(e) =>
                        setOpts({
                          ...opts,
                          staging: e.target.checked,
                        })
                      }
                    />
                  </td>
                </tr>
                <tr>
                  <td>DANDI API key</td>
                  <td>
                    <input
                      type="password"
                      value={opts?.dandiApiKey || ""}
                      onChange={(e) =>
                        setOpts({
                          ...opts,
                          dandiApiKey: e.target.value as string,
                        })
                      }
                    />
                  </td>
                </tr>
              </tbody>
            </table>
            <SelectDendroApiKeyComponent
              value={dendroApiKey}
              setValue={setDendroApiKey}
            />
            {uploadDisabled && (
              <div style={{ color: "red" }}>{uploadDisabledReason}</div>
            )}
            <button
              disabled={uploadDisabled || submittingJob}
              onClick={handleSubmitUploadJob}
              style={{ marginTop: "1em" }}
            >
              Submit upload job
            </button>
            {submittingJob && <div>Submitting job...</div>}
          </div>
        )}
      </div>
    </div>
  );
};

const isValidAssetPath = (assetPath: string): boolean => {
  if (!assetPath.endsWith(".nwb.lindi.tar")) {
    return false;
  }
  // example: sub-521885/sub-521885_ses-20200709_behavior+ecephys.nwb.lindi.tar
  const parts = assetPath.split("/");
  if (![2, 3].includes(parts.length)) {
    return false;
  }
  return true;
};

const submitJob = async (o: {
  dandisetId: string;
  dandisetVersion: string;
  assetPath: string;
  dandiApiKey: string;
  staging: boolean;
  nwbFileUrl: string;
  dendroApiKey: string;
}) => {
  const {
    dandisetId,
    dandisetVersion,
    assetPath,
    dandiApiKey,
    staging,
    nwbFileUrl,
    dendroApiKey,
  } = o;
  const jobDefinition: DendroJobDefinition = {
    appName: "hello_neurosift",
    processorName: "dandi_upload",
    inputFiles: [
      {
        name: "input",
        fileBaseName: "input.nwb.lindi.tar",
        url: nwbFileUrl,
      },
    ],
    outputFiles: [
      {
        name: "output",
        fileBaseName: "uploaded.nwb.lindi.tar",
        urlDeterminedAtRuntime: true,
      },
    ],
    parameters: [
      {
        name: "dandiset_id",
        value: dandisetId,
      },
      {
        name: "dandiset_version",
        value: dandisetVersion,
      },
      {
        name: "asset_path",
        value: assetPath,
      },
      {
        name: "staging",
        value: staging,
      },
    ],
  };
  const serviceName = "hello_world_service";
  const requiredResources: DendroJobRequiredResources = {
    numCpus: 1,
    numGpus: 0,
    memoryGb: 4,
    timeSec: 60 * 60,
  };
  const secrets = [
    {
      name: "DANDI_API_KEY",
      value: dandiApiKey,
    },
  ];
  const req: CreateJobRequest = {
    type: "createJobRequest",
    serviceName,
    userId: "",
    batchId: "",
    tags: ["neurosift", "dandi_upload", `nwb:${nwbFileUrl}`],
    jobDefinition,
    requiredResources,
    targetComputeClientIds: ["*"],
    secrets,
    jobDependencies: [],
    skipCache: true,
    rerunFailing: true,
    deleteFailing: true,
  };
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${dendroApiKey}`,
  };
  const resp = await fetch(`https://dendro.vercel.app/api/createJob`, {
    method: "POST",
    headers,
    body: JSON.stringify(req),
  });
  if (!resp.ok) {
    throw Error(`Error creating job: ${resp.statusText}`);
  }
  const rr = await resp.json();
  if (!isCreateJobResponse(rr)) {
    throw Error(`Unexpected response: ${JSON.stringify(rr)}`);
  }
};

export default UploadToDandiView;
