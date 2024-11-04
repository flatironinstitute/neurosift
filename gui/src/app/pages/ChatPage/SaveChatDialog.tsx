import { FunctionComponent, useEffect, useState } from "react";
import { Chat, ChatContext } from "./ChatWindow";
import { useSavedChats } from "../SavedChatsPage/savedChatsApi";
import useNeurosiftSavedChats from "app/NeurosiftSavedChats/useNeurosiftSavedChats";
import useRoute from "app/useRoute";
import { NeurosiftSavedChatsLoginView } from "app/ApiKeysWindow/ApiKeysWindow";
import { Hyperlink } from "@fi-sci/misc";
import { ORMessage } from "../DandisetPage/DandisetViewFromDendro/openRouterTypes";
import chatCompletion from "./chatCompletion";

type SaveChatDialogProps = {
  chat: Chat;
  onClose: () => void;
  openRouterKey: string | null;
  chatContext: ChatContext;
  images: { name: string; dataUrl: string }[];
};

const SaveChatDialog: FunctionComponent<SaveChatDialogProps> = ({
  chat,
  onClose,
  openRouterKey,
  chatContext,
  images,
}) => {
  const { addSavedChat } = useSavedChats({ load: false });
  const { neurosiftSavedChatsAccessToken, neurosiftSavedChatsUserId } =
    useNeurosiftSavedChats();
  const [chatTitle, setChatTitle] = useState<string>("");
  const [chatLink, setChatLink] = useState<string | null>(null);
  const recommendedChatTitle = useRecommendedChatTitle(chat, openRouterKey);
  useEffect(() => {
    setChatTitle((c) => (!c ? recommendedChatTitle : c));
  }, [recommendedChatTitle]);
  const { setRoute } = useRoute();
  if (!neurosiftSavedChatsAccessToken) {
    return <NeurosiftSavedChatsLoginView />;
  }
  if (chatLink) {
    return (
      <div style={{ padding: 20 }}>
        <h3>Chat saved</h3>
        <p>
          You can view your chat at {chatLink} <CopyButton text={chatLink} />
        </p>
        <button onClick={onClose}>Close</button>
      </div>
    );
  }
  if (!addSavedChat) {
    return <div>Unexpected: addSavedChat is not available</div>;
  }
  return (
    <div style={{ padding: 20 }}>
      <h3>
        Your chat will be publicly visible under your user ID:{" "}
        {neurosiftSavedChatsUserId}
      </h3>
      <hr />
      <div>
        <EditChatTitleComponent
          chatTitle={chatTitle}
          setChatTitle={setChatTitle}
        />
      </div>
      <div>
        <button
          onClick={async () => {
            const ok = window.confirm(
              "Are you sure you want to save this chat publicly?",
            );
            if (!ok) {
              return;
            }
            let dandisetId: string | undefined;
            let nwbFileUrl: string | undefined;
            if (chatContext.type === "main") {
              dandisetId = undefined;
              nwbFileUrl = undefined;
            } else if (chatContext.type === "dandiset") {
              dandisetId = chatContext.dandisetId;
              nwbFileUrl = undefined;
            } else if (chatContext.type === "nwb") {
              dandisetId = undefined;
              nwbFileUrl = chatContext.nwbUrl;
            }
            const chatId = await addSavedChat({
              chatTitle,
              messages: chat.messages,
              dandisetId,
              nwbFileUrl,
              images,
            });
            if (!chatId) {
              alert("Failed to save chat");
            }
            let chatLink = `https://neurosift.app?p=/chat&chatId=${chatId}`;
            if (chatContext.type === "dandiset") {
              chatLink += `&dandisetId=${chatContext.dandisetId}`;
            }
            setChatLink(chatLink);
          }}
          disabled={!chatTitle}
        >
          Save chat
        </button>
        &nbsp;
        <button onClick={onClose}>Cancel</button>
      </div>
      <hr />
      <div>
        <Hyperlink
          onClick={() => {
            setRoute({ page: "saved-chats" });
          }}
        >
          View saved chats
        </Hyperlink>
      </div>
    </div>
  );
};

const EditChatTitleComponent: FunctionComponent<{
  chatTitle: string;
  setChatTitle: (chatTitle: string) => void;
}> = ({ chatTitle, setChatTitle }) => {
  return (
    <div>
      <label>Chat title&nbsp;</label>
      <input
        type="text"
        value={chatTitle}
        onChange={(e) => setChatTitle(e.target.value)}
        style={{ width: "100%" }}
      />
    </div>
  );
};

export const getRecommendedChatTitle = async (
  chat: Chat,
  openRouterKey: string | null,
) => {
  const messages: ORMessage[] = [
    ...chat.messages.filter((m) => m.role !== "client-side-only"),
    {
      role: "user",
      content:
        "What is a short recommended title for this chat? Respond with the chat title only.",
    },
  ];
  const response = await chatCompletion({
    messages,
    modelName: "gpt-4o-mini",
    openRouterKey,
    tools: [],
  });
  const x = response.assistantMessage;
  // remove "" and strip
  const y = x.replace(/^"(.*)"$/, "$1").trim();
  return y;
};

const useRecommendedChatTitle = (chat: Chat, openRouterKey: string | null) => {
  const [recommendedChatTitle, setRecommendedChatTitle] = useState<string>("");
  useEffect(() => {
    let canceled = false;
    const load = async () => {
      const y = await getRecommendedChatTitle(chat, openRouterKey);
      setRecommendedChatTitle(y);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [chat, openRouterKey]);
  return recommendedChatTitle;
};

const CopyButton: FunctionComponent<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
};

export default SaveChatDialog;
