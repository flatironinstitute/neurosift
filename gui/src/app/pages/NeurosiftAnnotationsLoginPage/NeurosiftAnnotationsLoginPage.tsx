import { FunctionComponent, useEffect } from "react";
import useRoute from "neurosift-lib/contexts/useRoute";

type Props = {
  //
};

const NeurosiftSavedChatsLoginPage: FunctionComponent<Props> = () => {
  const { route, setRoute } = useRoute();
  if (route.page !== "neurosift-saved-chats-login")
    throw new Error("wrong page");
  useEffect(() => {
    if (route.accessToken) {
      localStorage.setItem(
        "neurosift-saved-chats-access-token",
        route.accessToken,
      );
      setRoute({ page: "neurosift-saved-chats-login", accessToken: "" }, true);
    }
  }, [route, setRoute]);

  const savedAccessToken = localStorage.getItem(
    "neurosift-saved-chats-access-token",
  );

  if (savedAccessToken && !route.accessToken) {
    return (
      <div>
        You are logged in to Neurosift Saved Chats. You may close this window.
      </div>
    );
  } else if (route.accessToken) {
    return <div>Logging in to Neurosift Saved Chats...</div>;
  } else {
    return (
      <div>
        You are not logged in to Neurosift Saved Chats. Something probably went
        wrong.
      </div>
    );
  }
};

export default NeurosiftSavedChatsLoginPage;
