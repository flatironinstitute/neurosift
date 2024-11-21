import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";

import { Hyperlink } from "@fi-sci/misc";
import { Edit } from "@mui/icons-material";
import Splitter from "neurosift-lib/components/Splitter";
import { chatReducer, emptyChat } from "neurosift-lib/pages/ChatPage/Chat";
import { Dandiset as DandisetMetadata } from "neurosift-lib/pages/ChatPage/tools/dandi-archive-schema";
import EditContributorsWindow from "../TestPage/EditContributorsWindow";
import EditDandisetMetadataChatWindow from "../TestPage/EditDandisetMetadataChatWindow";

type EditDandisetMetadataProps = {
  width: number;
  height: number;
  dandisetId: string;
  dandiStagingApiKey?: string;
};

type ViewMode = "main" | "edit-contributors";

const EditDandisetMetadata: FunctionComponent<EditDandisetMetadataProps> = ({
  width,
  height,
  dandisetId,
  dandiStagingApiKey,
}) => {
  const { dandisetMetadata, refreshDandisetMetadata } = useDandisetMetadata(
    dandisetId,
    "draft",
  );
  const [editedDandisetMetadata, setEditedDandisetMetadata] =
    useState<DandisetMetadata | null>(null);
  useEffect(() => {
    setEditedDandisetMetadata(dandisetMetadata || null);
  }, [dandisetMetadata]);
  const [view, setView] = useState<ViewMode>("main");
  const [chat, chatDispatch] = useReducer(chatReducer, emptyChat);
  const [returnable, setReturnable] = useState<boolean>(false);

  const handleSaveChanges = useCallback(async () => {
    if (!editedDandisetMetadata) {
      throw Error("Unexpected, no editedDandisetMetadata");
    }
    if (!dandiStagingApiKey) {
      alert("No dandiStagingApiKey provided");
      return;
    }
    const url = `https://api-staging.dandiarchive.org/api/dandisets/${dandisetId}/versions/draft/`;
    const headers = {
      accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `token ${dandiStagingApiKey}`,
    };
    const response = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        metadata: editedDandisetMetadata,
        name: editedDandisetMetadata.name,
      }),
    });
  }, [editedDandisetMetadata, dandisetId, dandiStagingApiKey]);

  const returnToEditingDandisetMetadataComponet = (
    <button disabled={!returnable} onClick={() => setView("main")}>
      Return to editing dandiset metadata
    </button>
  );
  const topBarHeight = 30;
  const topBarComponent = (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height: topBarHeight,
      }}
    >
      <div style={{ paddingLeft: 20 }}>
        {returnToEditingDandisetMetadataComponet}
      </div>
    </div>
  );
  if (!dandisetMetadata) {
    return <div>Loading dandiset metadata...</div>;
  }
  if (view === "edit-contributors") {
    if (!editedDandisetMetadata) return <div>xx</div>;
    return (
      <div style={{ position: "absolute", width, height }}>
        {topBarComponent}
        <div
          style={{
            position: "absolute",
            top: topBarHeight,
            left: 0,
            width,
            height: height - topBarHeight,
          }}
        >
          <EditContributorsWindow
            width={width}
            height={height - topBarHeight}
            dandisetId={dandisetId}
            dandisetMetadata={editedDandisetMetadata}
            setDandisetMetadata={setEditedDandisetMetadata}
            setReturnable={setReturnable}
          />
        </div>
      </div>
    );
  }
  return (
    <Splitter
      width={width}
      height={height}
      direction="horizontal"
      initialPosition={width / 2}
    >
      <EditDandisetMetadataChatWindow
        width={0}
        height={0}
        dandisetId={dandisetId}
        dandisetVersion={"draft"}
        dandisetMetadata={editedDandisetMetadata || dandisetMetadata}
        chat={chat}
        chatDispatch={chatDispatch}
        openRouterKey={localStorage.getItem("openRouterKey") || null}
      />
      <RightPanel
        width={0}
        height={0}
        originalDandisetMetadata={dandisetMetadata}
        dandisetMetadata={editedDandisetMetadata || dandisetMetadata}
        setDandisetMetadata={setEditedDandisetMetadata}
        dandisetId={dandisetId}
        dandisetVersion={"draft"}
        setView={setView}
        onSaveChanges={handleSaveChanges}
      />
    </Splitter>
  );
};

type RightPanelProps = {
  width: number;
  height: number;
  dandisetId: string;
  dandisetVersion: string;
  originalDandisetMetadata: DandisetMetadata;
  dandisetMetadata: DandisetMetadata;
  setDandisetMetadata: (metadata: DandisetMetadata) => void;
  setView: (m: ViewMode) => void;
  onSaveChanges: () => void;
};

const RightPanel: FunctionComponent<RightPanelProps> = ({
  dandisetId,
  dandisetVersion,
  originalDandisetMetadata,
  dandisetMetadata,
  setDandisetMetadata,
  width,
  height,
  setView,
  onSaveChanges,
}) => {
  const metadataHasBeenModified = useMemo(() => {
    return !deepEqual(dandisetMetadata, originalDandisetMetadata);
  }, [dandisetMetadata, originalDandisetMetadata]);
  const handleSaveChanges = useCallback(() => {
    const ok = window.confirm("Save changes to Dandiset Metadata?");
    if (!ok) return;
    onSaveChanges();
  }, [onSaveChanges]);
  return (
    <div style={{ width, height, overflow: "auto" }}>
      {metadataHasBeenModified && (
        <button onClick={handleSaveChanges}>
          Save changes to Dandiset Metadata
        </button>
      )}
      <h1>
        <a
          href={`https://gui-staging.dandiarchive.org/dandiset/${dandisetId}/${dandisetVersion}`}
          target="_blank"
          rel="noreferrer"
        >
          {dandisetMetadata.id}
        </a>
      </h1>
      <div>
        <NameSection
          dandisetMetadata={dandisetMetadata}
          onChange={setDandisetMetadata}
          modified={dandisetMetadata.name !== originalDandisetMetadata.name}
        />
        <hr />
        <DescriptionSection
          dandisetMetadata={dandisetMetadata}
          onChange={setDandisetMetadata}
          modified={
            dandisetMetadata.description !==
            originalDandisetMetadata.description
          }
        />
        <hr />
        <ContributorSection
          modified={
            !deepEqual(
              dandisetMetadata.contributor,
              originalDandisetMetadata.contributor,
            )
          }
          dandisetMetadata={dandisetMetadata}
          onEdit={() => setView("edit-contributors")}
        />
        <hr />
        <AboutSection
          modified={
            !deepEqual(dandisetMetadata.about, originalDandisetMetadata.about)
          }
          dandisetMetadata={dandisetMetadata}
        />
        <hr />
        <StudyTargetSection
          modified={
            !deepEqual(
              dandisetMetadata.studyTarget,
              originalDandisetMetadata.studyTarget,
            )
          }
          dandisetMetadata={dandisetMetadata}
        />
        <hr />
        <LicenseSection
          modified={
            !deepEqual(
              dandisetMetadata.license,
              originalDandisetMetadata.license,
            )
          }
          dandisetMetadata={dandisetMetadata}
        />
        <hr />
        <ProtocolSection
          modified={
            !deepEqual(
              dandisetMetadata.protocol,
              originalDandisetMetadata.protocol,
            )
          }
          dandisetMetadata={dandisetMetadata}
        />
        <hr />
        <EthicsApprovalSection
          modified={
            !deepEqual(
              dandisetMetadata.ethicsApproval,
              originalDandisetMetadata.ethicsApproval,
            )
          }
          dandisetMetadata={dandisetMetadata}
        />
        <hr />
        <KeywordsSection
          modified={
            !deepEqual(
              dandisetMetadata.keywords,
              originalDandisetMetadata.keywords,
            )
          }
          dandisetMetadata={dandisetMetadata}
        />
        <hr />
        <AcknowledgementSection
          modified={
            !deepEqual(
              dandisetMetadata.acknowledgement,
              originalDandisetMetadata.acknowledgement,
            )
          }
          dandisetMetadata={dandisetMetadata}
        />
        <hr />
        <AccessSection
          modified={
            !deepEqual(dandisetMetadata.access, originalDandisetMetadata.access)
          }
          dandisetMetadata={dandisetMetadata}
        />
        <hr />
        <UrlSection
          modified={
            !deepEqual(dandisetMetadata.url, originalDandisetMetadata.url)
          }
          dandisetMetadata={dandisetMetadata}
        />
        <hr />
        <RepositorySection
          modified={
            !deepEqual(
              dandisetMetadata.repository,
              originalDandisetMetadata.repository,
            )
          }
          dandisetMetadata={dandisetMetadata}
        />
        <hr />
        <RelatedResourceSection
          modified={
            !deepEqual(
              dandisetMetadata.relatedResource,
              originalDandisetMetadata.relatedResource,
            )
          }
          dandisetMetadata={dandisetMetadata}
        />
        <hr />
        <WasGeneratedBySection
          modified={
            !deepEqual(
              dandisetMetadata.wasGeneratedBy,
              originalDandisetMetadata.wasGeneratedBy,
            )
          }
          dandisetMetadata={dandisetMetadata}
        />
        <hr />
        <DateCreatedSection
          modified={
            !deepEqual(
              dandisetMetadata.dateCreated,
              originalDandisetMetadata.dateCreated,
            )
          }
          dandisetMetadata={dandisetMetadata}
        />
        <hr />
        <DateModifiedSection
          modified={
            !deepEqual(
              dandisetMetadata.dateModified,
              originalDandisetMetadata.dateModified,
            )
          }
          dandisetMetadata={dandisetMetadata}
        />
        <hr />
        <CitationSection
          modified={
            !deepEqual(
              dandisetMetadata.citation,
              originalDandisetMetadata.citation,
            )
          }
          dandisetMetadata={dandisetMetadata}
        />
        <hr />
        <AssetsSummarySection
          modified={false}
          dandisetMetadata={dandisetMetadata}
        />
        <hr />
        <ManifestLocationSection
          modified={
            !deepEqual(
              dandisetMetadata.manifestLocation,
              originalDandisetMetadata.manifestLocation,
            )
          }
          dandisetMetadata={dandisetMetadata}
        />
        <hr />
        <VersionSection
          modified={
            !deepEqual(
              dandisetMetadata.version,
              originalDandisetMetadata.version,
            )
          }
          dandisetMetadata={dandisetMetadata}
        />
        <hr />
      </div>
    </div>
  );
};

type EditTextFieldProps = {
  modified?: boolean;
  label: string;
  value: string | undefined;
  setValue: (value: string | undefined) => void;
};

const EditTextField: FunctionComponent<EditTextFieldProps> = ({
  modified,
  label,
  value,
  setValue,
}) => {
  const [editedValue, setEditedValue] = useState<string | undefined>(value);
  const isModified = value !== editedValue;

  return (
    <div>
      <label
        style={{
          fontWeight: "bold",
          color: modified ? "darkmagenta" : "black",
        }}
      >
        {label}
        {modified ? "*" : ""}:&nbsp;
        <input
          type="text"
          value={editedValue || ""}
          onChange={(event) => setEditedValue(event.target.value)}
          style={{ color: isModified ? "red" : "black" }}
        />
      </label>
      {isModified && (
        <button onClick={() => setValue(editedValue)}>Apply</button>
      )}
    </div>
  );
};

const EditMultilineTextField: FunctionComponent<EditTextFieldProps> = ({
  modified,
  label,
  value,
  setValue,
}) => {
  const [editedValue, setEditedValue] = useState<string | undefined>(value);
  const isModified = value !== editedValue;

  return (
    <div
      style={{
        maxWidth: 800,
        width: "100%",
        color: modified ? "darkmagenta" : "black",
      }}
    >
      <label style={{ fontWeight: "bold" }}>
        {label}
        {modified ? "*" : ""}:&nbsp;
      </label>
      <textarea
        value={editedValue || ""}
        onChange={(event) => setEditedValue(event.target.value)}
        style={{
          color: isModified ? "red" : "black",
          width: "100%",
          height: "12em",
        }}
      />
      {isModified && (
        <button onClick={() => setValue(editedValue)}>Apply</button>
      )}
    </div>
  );
};

type ReadOnlyTextFieldProps = {
  modified: boolean;
  label: string;
  value: string;
  onClick?: () => void;
};

const ReadOnlyTextField: FunctionComponent<ReadOnlyTextFieldProps> = ({
  modified,
  label,
  value,
  onClick,
}) => {
  const label2 = label + (modified ? "*" : "");
  return (
    <div style={{ color: modified ? "darkmagenta" : "black" }}>
      <label style={{ fontWeight: "bold" }}>
        {onClick ? (
          <Hyperlink onClick={onClick}>
            <Edit fontSize={"tiny" as any} /> {label2}
          </Hyperlink>
        ) : (
          label2
        )}
        :&nbsp;
      </label>
      <span>{value}</span>
    </div>
  );
};

const NameSection: FunctionComponent<{
  dandisetMetadata: DandisetMetadata;
  onChange: (metadata: DandisetMetadata) => void;
  modified: boolean;
}> = ({ dandisetMetadata, onChange, modified }) => {
  return (
    <EditTextField
      modified={modified}
      label="Name"
      value={dandisetMetadata.name}
      setValue={(name) => onChange({ ...dandisetMetadata, name: name || "" })}
    />
  );
};

const DescriptionSection: FunctionComponent<{
  modified: boolean;
  dandisetMetadata: DandisetMetadata;
  onChange: (metadata: DandisetMetadata) => void;
}> = ({ dandisetMetadata, onChange, modified }) => {
  return (
    <EditMultilineTextField
      modified={modified}
      label="Description"
      value={dandisetMetadata.description}
      setValue={(description) =>
        onChange({ ...dandisetMetadata, description: description || "" })
      }
    />
  );
};

const ContributorSection: FunctionComponent<{
  modified: boolean;
  dandisetMetadata: DandisetMetadata;
  onEdit: () => void;
}> = ({ dandisetMetadata, onEdit, modified }) => {
  return (
    <div>
      <ReadOnlyTextField
        modified={modified}
        label="Contributors"
        value={dandisetMetadata.contributor.map((c) => c.name).join(", ")}
        onClick={onEdit}
      />
    </div>
  );
};

const AboutSection: FunctionComponent<{
  modified: boolean;
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata, modified }) => {
  return (
    <ReadOnlyTextField
      modified={modified}
      label="About"
      value={dandisetMetadata.about?.map((a) => a.name).join(", ") || ""}
    />
  );
};

const StudyTargetSection: FunctionComponent<{
  modified: boolean;
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata, modified }) => {
  return (
    <ReadOnlyTextField
      modified={modified}
      label="Study Target"
      value={dandisetMetadata.studyTarget?.join(", ") || ""}
    />
  );
};

const LicenseSection: FunctionComponent<{
  modified: boolean;
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata, modified }) => {
  return (
    <ReadOnlyTextField
      modified={modified}
      label="License"
      value={dandisetMetadata.license.join(", ")}
    />
  );
};

const ProtocolSection: FunctionComponent<{
  modified: boolean;
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata, modified }) => {
  return (
    <ReadOnlyTextField
      modified={modified}
      label="Protocol"
      value={dandisetMetadata.protocol?.join(", ") || ""}
    />
  );
};

const EthicsApprovalSection: FunctionComponent<{
  modified: boolean;
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata, modified }) => {
  return (
    <ReadOnlyTextField
      modified={modified}
      label="Ethics Approval"
      value={dandisetMetadata.ethicsApproval?.join(", ") || ""}
    />
  );
};

const KeywordsSection: FunctionComponent<{
  modified: boolean;
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata, modified }) => {
  return (
    <ReadOnlyTextField
      modified={modified}
      label="Keywords"
      value={dandisetMetadata.keywords?.join(", ") || ""}
    />
  );
};

const AcknowledgementSection: FunctionComponent<{
  modified: boolean;
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata, modified }) => {
  return (
    <ReadOnlyTextField
      modified={modified}
      label="Acknowledgement"
      value={dandisetMetadata.acknowledgement || ""}
    />
  );
};

const AccessSection: FunctionComponent<{
  modified: boolean;
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata, modified }) => {
  return (
    <ReadOnlyTextField
      modified={modified}
      label="Access"
      value={dandisetMetadata.access?.map((a) => a.status).join(", ") || ""}
    />
  );
};

const UrlSection: FunctionComponent<{
  modified: boolean;
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata, modified }) => {
  return (
    <ReadOnlyTextField
      modified={modified}
      label="URL"
      value={dandisetMetadata.url || ""}
    />
  );
};

const RepositorySection: FunctionComponent<{
  modified: boolean;
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata, modified }) => {
  return (
    <ReadOnlyTextField
      modified={modified}
      label="Repository"
      value={dandisetMetadata.repository || ""}
    />
  );
};

const RelatedResourceSection: FunctionComponent<{
  modified: boolean;
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata, modified }) => {
  return (
    <ReadOnlyTextField
      modified={modified}
      label="Related Resource"
      value={
        dandisetMetadata.relatedResource?.map((r) => r.name).join(", ") || ""
      }
    />
  );
};

const WasGeneratedBySection: FunctionComponent<{
  modified: boolean;
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata, modified }) => {
  return (
    <ReadOnlyTextField
      modified={modified}
      label="Was Generated By"
      value={dandisetMetadata.wasGeneratedBy?.join(", ") || ""}
    />
  );
};

const DateCreatedSection: FunctionComponent<{
  modified: boolean;
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata, modified }) => {
  return (
    <ReadOnlyTextField
      modified={modified}
      label="Date Created"
      value={dandisetMetadata.dateCreated || ""}
    />
  );
};

const DateModifiedSection: FunctionComponent<{
  modified: boolean;
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata, modified }) => {
  return (
    <ReadOnlyTextField
      modified={modified}
      label="Date Modified"
      value={dandisetMetadata.dateModified || ""}
    />
  );
};

const CitationSection: FunctionComponent<{
  modified: boolean;
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata, modified }) => {
  return (
    <ReadOnlyTextField
      modified={modified}
      label="Citation"
      value={dandisetMetadata.citation || ""}
    />
  );
};

const AssetsSummarySection: FunctionComponent<{
  modified: boolean;
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata, modified }) => {
  return (
    <ReadOnlyTextField
      modified={modified}
      label="Assets Summary"
      value={"[not implemented]"}
    />
  );
};

const ManifestLocationSection: FunctionComponent<{
  modified: boolean;
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata, modified }) => {
  return (
    <ReadOnlyTextField
      modified={modified}
      label="Manifest Location"
      value={dandisetMetadata.manifestLocation?.map((m) => m).join(", ") || ""}
    />
  );
};

const VersionSection: FunctionComponent<{
  modified: boolean;
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata, modified }) => {
  return (
    <ReadOnlyTextField
      modified={modified}
      label="Version"
      value={dandisetMetadata.version || ""}
    />
  );
};

const useDandisetMetadata = (
  dandisetId: string | undefined,
  dandisetVersion: string,
) => {
  const [dandisetMetadata, setDandisetMetadata] = useState<
    DandisetMetadata | undefined
  >(undefined);

  const [refreshCode, setRefreshCode] = useState<number>(0);

  useEffect(() => {
    let canceled = false;
    setDandisetMetadata(undefined);
    if (!dandisetId) return;
    const url = `https://api-staging.dandiarchive.org/api/dandisets/${dandisetId}/versions/draft/info/`;
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        if (canceled) return;
        setDandisetMetadata(data.metadata);
      })
      .catch((error) => {
        console.error("Error fetching dandiset metadata", error);
      });
    return () => {
      canceled = true;
    };
  }, [dandisetId, dandisetVersion, refreshCode]);

  const refreshDandisetMetadata = useCallback(() => {
    setRefreshCode((c) => c + 1);
  }, []);

  return { dandisetMetadata, refreshDandisetMetadata };
};

const deepEqual = (a: any, b: any) => {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
};

export default EditDandisetMetadata;
