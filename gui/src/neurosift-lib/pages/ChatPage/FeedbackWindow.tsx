import { FunctionComponent, useCallback, useState } from "react";
import { Chat } from "./Chat";
import { addSavedChat } from "../SavedChatsPage/savedChatsApi";
import useNeurosiftSavedChats from "../SavedChatsPage/useNeurosiftSavedChats";
import { getRecommendedChatTitle } from "./SaveChatDialog";
import { ChatContext } from "./ChatContext";

type FeedbackWindowProps = {
  onClose: () => void;
  chat: Chat;
  response: "helpful" | "unhelpful" | "neutral";
  openRouterKey: string | null;
  chatContext: ChatContext;
};

const FeedbackWindow: FunctionComponent<FeedbackWindowProps> = ({
  onClose,
  chat,
  response,
  openRouterKey,
  chatContext,
}) => {
  const [notes, setNotes] = useState<string>("");
  const { neurosiftSavedChatsUserId, neurosiftSavedChatsAccessToken } =
    useNeurosiftSavedChats();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const handleSubmit = useCallback(async () => {
    setStatusMessage("Getting chat title...");
    const title = await getRecommendedChatTitle(chat, openRouterKey);
    setStatusMessage("Saving chat...");
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
    await addSavedChat({
      chatTitle: title,
      messages: chat.messages,
      dandisetId,
      nwbFileUrl,
      feedbackResponse: response,
      feedbackNotes: notes,
      feedbackOnly: true,
      userId: neurosiftSavedChatsUserId || undefined,
      neurosiftSavedChatsAccessToken:
        neurosiftSavedChatsAccessToken || undefined,
    });
    setStatusMessage(null);
    onClose();
  }, [
    chat,
    response,
    notes,
    neurosiftSavedChatsUserId,
    neurosiftSavedChatsAccessToken,
    onClose,
    openRouterKey,
    chatContext,
  ]);
  return (
    <div>
      <h1>Chat feedback</h1>
      <p>
        Thank you for providing feedback. Your chat will be sent to the
        Neurosift team (and may be shared publicly) so we can improve this
        service.
      </p>
      <p>You responded: {response}</p>
      <EditNotesComponent notes={notes} setNotes={setNotes} />
      <div>
        <button onClick={handleSubmit} disabled={statusMessage !== null}>
          Submit
        </button>
        &nbsp;
        <button onClick={onClose}>Cancel</button>
      </div>
      <div>
        {statusMessage && (
          <span style={{ color: "blue" }}>{statusMessage}</span>
        )}
      </div>
    </div>
  );
};

type EditNotesComponentProps = {
  notes: string;
  setNotes: (notes: string) => void;
};

const EditNotesComponent: FunctionComponent<EditNotesComponentProps> = ({
  notes,
  setNotes,
}) => {
  return (
    <div>
      <div>Notes:</div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={15}
        style={{ width: 400 }}
      />
    </div>
  );
};

export default FeedbackWindow;
