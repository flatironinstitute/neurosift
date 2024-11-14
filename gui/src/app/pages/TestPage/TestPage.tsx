import { FunctionComponent, useEffect, useReducer, useState } from "react";

import useRoute from "neurosift-lib/contexts/useRoute";
import { Dandiset as DandisetMetadata } from "./dandi-archive-schema";
import Splitter from "neurosift-lib/components/Splitter";
import EditDandisetMetadataChatWindow from "./EditDandisetMetadataChatWindow";
import { chatReducer, emptyChat } from "neurosift-lib/pages/ChatPage/Chat";

type TestPageProps = {
  width: number;
  height: number;
};

const TestPage: FunctionComponent<TestPageProps> = ({ width, height }) => {
  const { route } = useRoute();
  if (route.page !== "test") throw Error("Unexpected page: " + route.page);
  const { dandisetId, dandisetVersion } = route;
  const dandisetMetadata = useDandisetMetadata(
    dandisetId,
    dandisetVersion || "draft",
  );
  const [chat, chatDispatch] = useReducer(chatReducer, emptyChat);
  if (!dandisetId) {
    return <div>No dandisetId in query of URL</div>;
  }
  if (!dandisetMetadata) {
    return <div>Loading dandiset metadata...</div>;
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
        dandisetMetadata={dandisetMetadata}
        chat={chat}
        chatDispatch={chatDispatch}
        openRouterKey={localStorage.getItem("openRouterKey") || null}
      />
      <RightPanel
        width={0}
        height={0}
        dandisetMetadata={dandisetMetadata}
        dandisetId={dandisetId}
        dandisetVersion={dandisetVersion || "draft"}
      />
    </Splitter>
  );
};

type RightPanelProps = {
  width: number;
  height: number;
  dandisetId: string;
  dandisetVersion: string;
  dandisetMetadata: DandisetMetadata;
};

const RightPanel: FunctionComponent<RightPanelProps> = ({
  dandisetId,
  dandisetVersion,
  dandisetMetadata,
  width,
  height,
}) => {
  return (
    <div style={{ width, height, overflow: "auto" }}>
      <h1>
        <a
          href={`https://dandiarchive.org/dandiset/${dandisetId}/${dandisetVersion}`}
        >
          {dandisetMetadata.id}
        </a>
      </h1>
      <div>
        <NameSection dandisetMetadata={dandisetMetadata} />
        <hr />
        <DescriptionSection dandisetMetadata={dandisetMetadata} />
        <hr />
        <ContributorSection dandisetMetadata={dandisetMetadata} />
        <hr />
        <AboutSection dandisetMetadata={dandisetMetadata} />
        <hr />
        <StudyTargetSection dandisetMetadata={dandisetMetadata} />
        <hr />
        <LicenseSection dandisetMetadata={dandisetMetadata} />
        <hr />
        <ProtocolSection dandisetMetadata={dandisetMetadata} />
        <hr />
        <EthicsApprovalSection dandisetMetadata={dandisetMetadata} />
        <hr />
        <KeywordsSection dandisetMetadata={dandisetMetadata} />
        <hr />
        <AcknowledgementSection dandisetMetadata={dandisetMetadata} />
        <hr />
        <AccessSection dandisetMetadata={dandisetMetadata} />
        <hr />
        <UrlSection dandisetMetadata={dandisetMetadata} />
        <hr />
        <RepositorySection dandisetMetadata={dandisetMetadata} />
        <hr />
        <RelatedResourceSection dandisetMetadata={dandisetMetadata} />
        <hr />
        <WasGeneratedBySection dandisetMetadata={dandisetMetadata} />
        <hr />
        <DateCreatedSection dandisetMetadata={dandisetMetadata} />
        <hr />
        <DateModifiedSection dandisetMetadata={dandisetMetadata} />
        <hr />
        <CitationSection dandisetMetadata={dandisetMetadata} />
        <hr />
        <AssetsSummarySection dandisetMetadata={dandisetMetadata} />
        <hr />
        <ManifestLocationSection dandisetMetadata={dandisetMetadata} />
        <hr />
        <VersionSection dandisetMetadata={dandisetMetadata} />
        <hr />
      </div>
    </div>
  );
};

type EditTextFieldProps = {
  label: string;
  value: string | undefined;
  setValue: (value: string) => void;
  originalValue: string;
};

const EditTextField: FunctionComponent<EditTextFieldProps> = ({
  label,
  value,
  setValue,
  originalValue,
}) => {
  const isModified = value !== originalValue;

  return (
    <div>
      <label style={{ fontWeight: "bold" }}>
        {label}:&nbsp;
        <input
          type="text"
          value={value || ""}
          onChange={(event) => setValue(event.target.value)}
          style={{ color: isModified ? "red" : "black" }}
        />
      </label>
      {isModified && (
        <button onClick={() => setValue(originalValue)}>Reset</button>
      )}
    </div>
  );
};

const EditMultilineTextField: FunctionComponent<EditTextFieldProps> = ({
  label,
  value,
  setValue,
  originalValue,
}) => {
  const isModified = value !== originalValue;

  return (
    <div style={{ maxWidth: 800, width: "100%" }}>
      <label style={{ fontWeight: "bold" }}>{label}</label>
      <textarea
        value={value || ""}
        onChange={(event) => setValue(event.target.value)}
        style={{
          color: isModified ? "red" : "black",
          width: "100%",
          height: "12em",
        }}
      />
      {isModified && (
        <button onClick={() => setValue(originalValue)}>Reset</button>
      )}
    </div>
  );
};

type ReadOnlyTextFieldProps = {
  label: string;
  value: string;
};

const ReadOnlyTextField: FunctionComponent<ReadOnlyTextFieldProps> = ({
  label,
  value,
}) => {
  return (
    <div>
      <label style={{ fontWeight: "bold" }}>{label}:&nbsp;</label>
      <span>{value}</span>
    </div>
  );
};

const NameSection: FunctionComponent<{
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata }) => {
  const [editedName, setEditedName] = useState<string>(dandisetMetadata.name);
  return (
    <EditTextField
      label="Name"
      value={editedName}
      setValue={setEditedName}
      originalValue={dandisetMetadata.name}
    />
  );
};

const DescriptionSection: FunctionComponent<{
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata }) => {
  const [editedDescription, setEditedDescription] = useState<string>(
    dandisetMetadata.description,
  );
  return (
    <EditMultilineTextField
      label="Description"
      value={editedDescription}
      setValue={setEditedDescription}
      originalValue={dandisetMetadata.description}
    />
  );
};

const ContributorSection: FunctionComponent<{
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata }) => {
  return (
    <ReadOnlyTextField
      label="Contributors"
      value={dandisetMetadata.contributor.map((c) => c.name).join(", ")}
    />
  );
};

const AboutSection: FunctionComponent<{
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata }) => {
  return (
    <ReadOnlyTextField
      label="About"
      value={dandisetMetadata.about?.map((a) => a.name).join(", ") || ""}
    />
  );
};

const StudyTargetSection: FunctionComponent<{
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata }) => {
  return (
    <ReadOnlyTextField
      label="Study Target"
      value={dandisetMetadata.studyTarget?.join(", ") || ""}
    />
  );
};

const LicenseSection: FunctionComponent<{
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata }) => {
  return (
    <ReadOnlyTextField
      label="License"
      value={dandisetMetadata.license.join(", ")}
    />
  );
};

const ProtocolSection: FunctionComponent<{
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata }) => {
  return (
    <ReadOnlyTextField
      label="Protocol"
      value={dandisetMetadata.protocol?.join(", ") || ""}
    />
  );
};

const EthicsApprovalSection: FunctionComponent<{
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata }) => {
  return (
    <ReadOnlyTextField
      label="Ethics Approval"
      value={dandisetMetadata.ethicsApproval?.join(", ") || ""}
    />
  );
};

const KeywordsSection: FunctionComponent<{
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata }) => {
  return (
    <ReadOnlyTextField
      label="Keywords"
      value={dandisetMetadata.keywords?.join(", ") || ""}
    />
  );
};

const AcknowledgementSection: FunctionComponent<{
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata }) => {
  return (
    <ReadOnlyTextField
      label="Acknowledgement"
      value={dandisetMetadata.acknowledgement || ""}
    />
  );
};

const AccessSection: FunctionComponent<{
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata }) => {
  return (
    <ReadOnlyTextField
      label="Access"
      value={dandisetMetadata.access?.map((a) => a.status).join(", ") || ""}
    />
  );
};

const UrlSection: FunctionComponent<{ dandisetMetadata: DandisetMetadata }> = ({
  dandisetMetadata,
}) => {
  return <ReadOnlyTextField label="URL" value={dandisetMetadata.url || ""} />;
};

const RepositorySection: FunctionComponent<{
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata }) => {
  return (
    <ReadOnlyTextField
      label="Repository"
      value={dandisetMetadata.repository || ""}
    />
  );
};

const RelatedResourceSection: FunctionComponent<{
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata }) => {
  return (
    <ReadOnlyTextField
      label="Related Resource"
      value={
        dandisetMetadata.relatedResource?.map((r) => r.name).join(", ") || ""
      }
    />
  );
};

const WasGeneratedBySection: FunctionComponent<{
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata }) => {
  return (
    <ReadOnlyTextField
      label="Was Generated By"
      value={dandisetMetadata.wasGeneratedBy?.join(", ") || ""}
    />
  );
};

const DateCreatedSection: FunctionComponent<{
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata }) => {
  return (
    <ReadOnlyTextField
      label="Date Created"
      value={dandisetMetadata.dateCreated || ""}
    />
  );
};

const DateModifiedSection: FunctionComponent<{
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata }) => {
  return (
    <ReadOnlyTextField
      label="Date Modified"
      value={dandisetMetadata.dateModified || ""}
    />
  );
};

const CitationSection: FunctionComponent<{
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata }) => {
  return (
    <ReadOnlyTextField
      label="Citation"
      value={dandisetMetadata.citation || ""}
    />
  );
};

const AssetsSummarySection: FunctionComponent<{
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata }) => {
  return (
    <ReadOnlyTextField label="Assets Summary" value={"[not implemented]"} />
  );
};

const ManifestLocationSection: FunctionComponent<{
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata }) => {
  return (
    <ReadOnlyTextField
      label="Manifest Location"
      value={dandisetMetadata.manifestLocation?.map((m) => m).join(", ") || ""}
    />
  );
};

const VersionSection: FunctionComponent<{
  dandisetMetadata: DandisetMetadata;
}> = ({ dandisetMetadata }) => {
  return (
    <ReadOnlyTextField label="Version" value={dandisetMetadata.version || ""} />
  );
};

const useDandisetMetadata = (
  dandisetId: string | undefined,
  dandisetVersion: string,
) => {
  const [dandisetMetadata, setDandisetMetadata] = useState<
    DandisetMetadata | undefined
  >(undefined);

  useEffect(() => {
    let canceled = false;
    setDandisetMetadata(undefined);
    if (!dandisetId) return;
    const url = `https://api.dandiarchive.org/api/dandisets/${dandisetId}/versions/draft/info/`;
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
  }, [dandisetId, dandisetVersion]);

  return dandisetMetadata;
};

export default TestPage;
