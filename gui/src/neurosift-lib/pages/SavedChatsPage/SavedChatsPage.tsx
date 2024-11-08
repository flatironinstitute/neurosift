import { NeurosiftSavedChatsLoginView } from "../ChatPage/NeurosiftSavedChatsLoginView";
import useNeurosiftSavedChats from "./useNeurosiftSavedChats";
import { FunctionComponent } from "react";
import { useSavedChats } from "./savedChatsApi";
import { timeAgoString } from "../../utils/timeStrings";
import { Hyperlink, SmallIconButton } from "@fi-sci/misc";
import { Add, Delete, Refresh } from "@mui/icons-material";
import useRoute, { Route } from "../../contexts/useRoute";
import { NeurosiftSavedChat } from "./types";

type SavedChatsPageProps = {
  width: number;
  height: number;
};

const SavedChatsPage: FunctionComponent<SavedChatsPageProps> = ({
  width,
  height,
}) => {
  const { route } = useRoute();
  if (route.page !== "saved-chats") throw Error("Unexpected page");
  const { feedback } = route;
  const padding = 10;
  const { savedChats, refreshSavedChats, deleteSavedChat } = useSavedChats({
    load: true,
    feedback,
  });
  const { neurosiftSavedChatsUserId } = useNeurosiftSavedChats();
  const { setRoute } = useRoute();
  return (
    <div
      style={{
        position: "absolute",
        width: width - padding * 2,
        height: height - padding * 2,
        backgroundColor: "#eee",
        padding,
        overflowY: "auto",
      }}
    >
      <div>
        <h4>Saved Chats</h4>
        <div>
          <NeurosiftSavedChatsLoginView />
        </div>
        <div>
          <div>
            <SmallIconButton
              icon={<Refresh />}
              title={"Refresh"}
              onClick={refreshSavedChats}
            />
            &nbsp;
            <SmallIconButton
              icon={<Add />}
              title={"Add"}
              onClick={() => {
                setRoute({
                  page: "chat",
                });
              }}
            />
          </div>
          {savedChats ? (
            <table className="nwb-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Title</th>
                  <th>User</th>
                  <th>Created</th>
                  {feedback && <th>Response</th>}
                  {feedback && <th>Notes</th>}
                </tr>
              </thead>
              <tbody>
                {savedChats.map((chat) => (
                  <tr key={chat.chatId}>
                    <td>
                      {chat.userId === neurosiftSavedChatsUserId &&
                      deleteSavedChat ? (
                        <SmallIconButton
                          icon={<Delete />}
                          title={"Delete"}
                          onClick={async () => {
                            const ok = window.confirm(
                              "Are you sure you want to delete this chat?",
                            );
                            if (!ok) return;
                            await deleteSavedChat({ chatId: chat.chatId });
                          }}
                        />
                      ) : (
                        <span />
                      )}
                    </td>
                    <td>
                      <Hyperlink
                        onClick={() => {
                          setRoute(routeForChat(chat));
                        }}
                      >
                        {chat.chatTitle}
                      </Hyperlink>
                    </td>
                    <td>{chat.userId}</td>
                    <td>{timeAgoString(chat.timestampCreated / 1000)}</td>
                    {feedback && <td>{chat.feedbackResponse}</td>}
                    {feedback && <td>{chat.feedbackNotes}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div>Loading saved chats...</div>
          )}
        </div>
      </div>
    </div>
  );
};

const routeForChat = (chat: NeurosiftSavedChat): Route => {
  if (chat.nwbFileUrl && chat.dandisetId) {
    return {
      page: "nwb",
      url: [chat.nwbFileUrl],
      dandisetId: chat.dandisetId,
      chatId: chat.chatId,
      storageType: [storageTypeForUrl(chat.nwbFileUrl)],
    };
  } else if (chat.dandisetId) {
    return {
      page: "dandiset",
      dandisetId: chat.dandisetId,
      chatId: chat.chatId,
    };
  } else {
    return {
      page: "chat",
      chatId: chat.chatId,
    };
  }
};

const storageTypeForUrl = (url: string): "h5" | "lindi" => {
  if (url.endsWith(".lindi.json") || url.endsWith(".lindi.tar")) {
    return "lindi";
  }
  return "h5";
};

export default SavedChatsPage;
