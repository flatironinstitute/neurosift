import { NeurosiftSavedChatsLoginView } from "app/ApiKeysWindow/ApiKeysWindow";
import useNeurosiftSavedChats from "app/NeurosiftSavedChats/useNeurosiftSavedChats";
import { FunctionComponent, useEffect } from "react";
import { useSavedChats } from "./savedChatsApi";
import { timeAgoString } from "app/timeStrings";
import { Hyperlink, SmallIconButton } from "@fi-sci/misc";
import { Add, Delete, Refresh } from "@mui/icons-material";
import useRoute from "app/useRoute";

type SavedChatsPageProps = {
  width: number;
  height: number;
};

const SavedChatsPage: FunctionComponent<SavedChatsPageProps> = ({
  width,
  height,
}) => {
  const padding = 10;
  const { savedChats, refreshSavedChats, deleteSavedChat } = useSavedChats({
    load: true,
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
                          setRoute({
                            page: "chat",
                            chatId: chat.chatId,
                          });
                        }}
                      >
                        {chat.chatTitle}
                      </Hyperlink>
                    </td>
                    <td>{chat.userId}</td>
                    <td>{timeAgoString(chat.timestampCreated / 1000)}</td>
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

export default SavedChatsPage;
