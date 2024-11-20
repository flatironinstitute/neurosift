import { SmallIconButton } from "@fi-sci/misc";
import ModalWindow, { useModalWindow } from "@fi-sci/modal-window";
import { Edit, ExitToApp, Save } from "@mui/icons-material";
import { diffWords } from "diff";
import yaml from "js-yaml";
import Splitter from "neurosift-lib/components/Splitter";
import { chatReducer, emptyChat } from "neurosift-lib/pages/ChatPage/Chat";
import {
  Dandiset,
  Dandiset as DandisetMetadata,
} from "neurosift-lib/pages/ChatPage/tools/dandi-archive-schema";
import { FunctionComponent, useEffect, useReducer, useState } from "react";
import { FaCheck } from "react-icons/fa";
import EditContributorsChatWindow from "./EditContributorsChatWindow";

type EditContributorsWindowProps = {
  width: number;
  height: number;
  dandisetId: string;
  dandisetMetadata: DandisetMetadata;
  setDandisetMetadata: (dandisetMetadata: DandisetMetadata) => void;
  onClose: () => void;
};

const EditContributorsWindow: FunctionComponent<
  EditContributorsWindowProps
> = ({
  dandisetId,
  dandisetMetadata,
  setDandisetMetadata,
  width,
  height,
  onClose,
}) => {
  const [chat, chatDispatch] = useReducer(chatReducer, emptyChat);
  const [editedDandisetMetadata, setEditedDandisetMetadata] =
    useState<Dandiset | null>(null);
  useEffect(() => {
    setEditedDandisetMetadata(dandisetMetadata);
  }, [dandisetMetadata]);
  const {
    visible: manualEditVisible,
    handleOpen: openManualEdit,
    handleClose: closeManualEdit,
  } = useModalWindow();
  if (!editedDandisetMetadata) return <div>x</div>;
  return (
    <div>
      <Splitter
        width={width}
        height={height}
        direction="horizontal"
        initialPosition={width / 2}
      >
        <EditContributorsChatWindow
          width={0}
          height={0}
          dandisetId={dandisetId}
          dandisetMetadata={dandisetMetadata}
          editedDandisetMetadata={editedDandisetMetadata}
          setEditedDandisetMetadata={setEditedDandisetMetadata}
          chat={chat}
          chatDispatch={chatDispatch}
          openRouterKey={localStorage.getItem("openRouterKey") || null}
        />
        <RightPanel
          width={0}
          height={0}
          dandisetMetadata={dandisetMetadata}
          editedDandisetMetadata={editedDandisetMetadata}
          onAcceptChanges={() => {
            chatDispatch({ type: "set", chat: emptyChat });
            setDandisetMetadata(editedDandisetMetadata);
          }}
          onCancelChanges={() => {
            chatDispatch({ type: "set", chat: emptyChat });
            setEditedDandisetMetadata(dandisetMetadata);
          }}
          onManualEdit={openManualEdit}
          onReturnToMainPage={onClose}
        />
      </Splitter>
      <ModalWindow visible={manualEditVisible} onClose={closeManualEdit}>
        <ManualEditWindow
          dandisetMetadata={dandisetMetadata}
          setDandisetMetadata={setDandisetMetadata}
          onClose={closeManualEdit}
        />
      </ModalWindow>
    </div>
  );
};

type RightPanelProps = {
  width: number;
  height: number;
  dandisetMetadata: DandisetMetadata;
  editedDandisetMetadata: DandisetMetadata;
  onAcceptChanges: () => void;
  onCancelChanges: () => void;
  onManualEdit: () => void;
  onReturnToMainPage: () => void;
};

const RightPanel: FunctionComponent<RightPanelProps> = ({
  width,
  height,
  dandisetMetadata,
  editedDandisetMetadata,
  onAcceptChanges,
  onCancelChanges,
  onManualEdit,
  onReturnToMainPage,
}) => {
  const topBarHeight = 20;
  const modified = dandisetMetadata !== editedDandisetMetadata;
  return (
    <div style={{ position: "absolute", width, height }}>
      <div
        style={{
          position: "absolute",
          width,
          height: topBarHeight,
          backgroundColor: "#ddd",
        }}
      >
        {modified && (
          <>
            <span style={{ color: modified ? "green" : "gray" }}>
              <SmallIconButton
                icon={<FaCheck />}
                label="Accept changes"
                onClick={onAcceptChanges}
                disabled={!modified}
              />
            </span>
            &nbsp;&nbsp;&nbsp;
          </>
        )}
        {modified && (
          <>
            <span style={{ color: modified ? "red" : "gray" }}>
              <SmallIconButton
                icon={<Save />}
                label="Cancel changes"
                onClick={onCancelChanges}
                disabled={!modified}
              />
            </span>
            &nbsp;&nbsp;&nbsp;
          </>
        )}
        {!modified && (
          <>
            <span style={{ color: modified ? "gray" : "black" }}>
              <SmallIconButton
                icon={<ExitToApp />}
                label="Return to main metadata page"
                onClick={onReturnToMainPage}
                disabled={modified}
              />
            </span>
            &nbsp;&nbsp;&nbsp;
          </>
        )}
        {!modified && (
          <>
            <span style={{ color: modified ? "gray" : "black" }}>
              <SmallIconButton
                icon={<Edit />}
                label="Edit manually"
                onClick={onManualEdit}
                disabled={modified}
              />
            </span>
            &nbsp;&nbsp;&nbsp;
          </>
        )}
      </div>
      <div
        style={{
          position: "absolute",
          width,
          height: height - topBarHeight,
          top: topBarHeight,
          overflow: "auto",
        }}
      >
        <HighlightedDiff
          original={specialToYaml(dandisetMetadata.contributor)}
          edited={specialToYaml(editedDandisetMetadata.contributor)}
        />
      </div>
    </div>
  );
};

const specialToYaml = (x: any) => {
  // put blank lines before each top-level array element
  const a = toYaml(x);
  const lines = a.split("\n");
  const newLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("- ") && i > 0) {
      newLines.push("");
      newLines.push(line);
    } else {
      newLines.push(line);
    }
  }
  return newLines.join("\n");
};

const toYaml = (contributor: any) => {
  return yaml.dump(contributor, { indent: 2 });
};

const HighlightedDiff = ({
  original,
  edited,
}: {
  original: string;
  edited: string;
}) => {
  const diff = diffWords(original, edited);

  return (
    <pre style={{ whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
      {diff.map((part, index) => {
        const style = part.added
          ? { backgroundColor: "lightgreen" }
          : part.removed
            ? { backgroundColor: "salmon", textDecoration: "line-through" }
            : {};
        return (
          <span key={index} style={style}>
            {part.value}
          </span>
        );
      })}
    </pre>
  );
};

type ManualEditWindowProps = {
  dandisetMetadata: DandisetMetadata;
  setDandisetMetadata: (dandisetMetadata: DandisetMetadata) => void;
  onClose: () => void;
};

const ManualEditWindow: FunctionComponent<ManualEditWindowProps> = ({
  dandisetMetadata,
  setDandisetMetadata,
  onClose,
}) => {
  const [text, setText] = useState<string>("");
  useEffect(() => {
    setText(specialToYaml(dandisetMetadata.contributor));
  }, [dandisetMetadata]);
  return (
    <div>
      <div>
        <button
          onClick={() => {
            try {
              const c = yaml.load(text) as any;
              setDandisetMetadata({ ...dandisetMetadata, contributor: c });
            } catch (e) {
              alert(e);
            }
            onClose();
          }}
        >
          Save
        </button>
        &nbsp;
        <button
          onClick={() => {
            onClose();
          }}
        >
          Cancel
        </button>
      </div>
      <textarea
        style={{ width: 800, height: 600 }}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </div>
  );
};

export default EditContributorsWindow;
