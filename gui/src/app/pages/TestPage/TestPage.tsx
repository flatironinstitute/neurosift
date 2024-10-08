/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useCallback, useEffect } from "react";
import {
  RemoteH5File,
  getRemoteH5File,
  RemoteH5FileLindi,
  getRemoteH5FileLindi,
} from "@remote-h5-file/index";
import { useContextChat } from "app/ContextChat/ContextChat";

type TestPageProps = {
  width: number;
  height: number;
};

const TestPage: FunctionComponent<TestPageProps> = () => {
  const { setContextItem } = useContextChat();
  useEffect(() => {
    const x = `
In your responses you can also reference the following special links which will trigger special functionality in the UI:
[Show recent Dandisets](?page=dandi)
`;
    setContextItem("test-page", { content: x });
  }, [setContextItem]);
  return (
    <div style={{ padding: 20 }}>
      <p>Testing chatbot.</p>
    </div>
  );
};

export default TestPage;
