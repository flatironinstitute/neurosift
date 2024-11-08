import { Hyperlink } from "@fi-sci/misc";
import { Button } from "@mui/material";
import useNeurosiftSavedChats from "../../pages/SavedChatsPage/useNeurosiftSavedChats";
import { FunctionComponent, useCallback, useEffect, useState } from "react";

type NeurosiftSavedChatsLoginViewProps = {
  onLoggedIn?: () => void;
  onClose?: () => void;
};

export const NeurosiftSavedChatsLoginView: FunctionComponent<
  NeurosiftSavedChatsLoginViewProps
> = ({ onLoggedIn, onClose }) => {
  const [, setRefreshCount] = useState(0);
  const refresh = useCallback(() => {
    setRefreshCount((c) => c + 1);
  }, []);
  const [logInHasBeenAttempted, setLogInHasBeenAttempted] = useState(false);
  const { setNeurosiftSavedChatsAccessToken, neurosiftSavedChatsUserId } =
    useNeurosiftSavedChats();
  useEffect(() => {
    // check every 1 second for login
    let lastAccessToken: string | null = null;
    const interval = setInterval(() => {
      const at = localStorage.getItem("neurosift-saved-chats-access-token");
      if (at !== lastAccessToken) {
        setNeurosiftSavedChatsAccessToken(at || "");
        lastAccessToken = at;
        if (at && logInHasBeenAttempted) {
          onLoggedIn && onLoggedIn();
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [logInHasBeenAttempted, onLoggedIn, setNeurosiftSavedChatsAccessToken]);
  if (neurosiftSavedChatsUserId) {
    return (
      <div>
        <span style={{ color: "darkgreen" }}>
          You are signed in to Neurosift Saved Chats as{" "}
          {neurosiftSavedChatsUserId}.
        </span>
        &nbsp;
        <Hyperlink
          onClick={() => {
            localStorage.removeItem("neurosift-saved-chats-access-token");
            refresh();
          }}
        >
          Log out
        </Hyperlink>
        {onClose && (
          <div>
            <Button onClick={onClose}>Close</Button>
          </div>
        )}
      </div>
    );
  } else {
    return (
      <div>
        You are not signed in to neurosift-saved-chats.&nbsp;
        <Hyperlink
          onClick={() => {
            setLogInHasBeenAttempted(true);
            window.open(
              "https://neurosift-saved-chats.vercel.app/logIn",
              "_blank",
              "height=600,width=600",
            );
          }}
        >
          Sign in
        </Hyperlink>
        {onClose && (
          <div>
            <Button onClick={onClose}>Close</Button>
          </div>
        )}
      </div>
    );
  }
};
