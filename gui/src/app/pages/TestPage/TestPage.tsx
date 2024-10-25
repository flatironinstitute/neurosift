/* eslint-disable @typescript-eslint/no-explicit-any */
import Splitter from "app/Splitter/Splitter";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import ChatWindow, { Chat } from "./ChatWindow";

type TestPageProps = {
  width: number;
  height: number;
};

const TestPage: FunctionComponent<TestPageProps> = ({ width, height }) => {
  const [openRouterKey, setOpenRouterKey] = useState<string | null>(null);
  const [chat, setChat] = useState<Chat>({ messages: [] });
  const logger = useMemo(() => new Logger(), []);
  const handleLogMessage = useCallback(
    (title: string, message: string) => {
      logger.log(title, message);
    },
    [logger],
  );
  return (
    <Splitter
      width={width}
      height={height}
      direction="horizontal"
      initialPosition={Math.min(300, width / 2)}
    >
      <LeftPanel
        width={0}
        height={0}
        openRouterKey={openRouterKey}
        setOpenRouterKey={setOpenRouterKey}
        logger={logger}
      />
      <ChatWindow
        width={0}
        height={0}
        chat={chat}
        setChat={setChat}
        openRouterKey={openRouterKey}
        onLogMessage={handleLogMessage}
      />
    </Splitter>
  );
};

type LeftPanelProps = {
  width: number;
  height: number;
  openRouterKey: string | null;
  setOpenRouterKey: (openRouterKey: string | null) => void;
  logger: Logger;
};

const LeftPanel: FunctionComponent<LeftPanelProps> = ({
  width,
  height,
  openRouterKey,
  setOpenRouterKey,
  logger,
}) => {
  const [logMessages, setLogMessages] = useState<
    { title: string; message: string }[]
  >([]);
  useEffect(() => {
    logger.addCallback((title, message) => {
      setLogMessages((prev) => [...prev, { title, message }]);
    });
  }, [logger]);
  return (
    <div style={{ position: "absolute", width, height, overflowY: "auto" }}>
      <div style={{ padding: 20 }}>
        <OpenRouterKeySelector
          openRouterKey={openRouterKey}
          setOpenRouterKey={setOpenRouterKey}
        />
        {logMessages.map((m, i) => (
          <ExpandableLogMessage key={i} title={m.title} message={m.message} />
        ))}
      </div>
    </div>
  );
};

type ExpandableLogMessageProps = {
  title: string;
  message: string;
};

const ExpandableLogMessage: FunctionComponent<ExpandableLogMessageProps> = ({
  title,
  message,
}) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <div
        onClick={() => setExpanded((prev) => !prev)}
        style={{ cursor: "pointer" }}
      >
        <b>{title}</b>
      </div>
      {expanded && <div style={{ paddingLeft: 20 }}>{message}</div>}
    </div>
  );
};

type OpenRouterKeySelectorProps = {
  openRouterKey: string | null;
  setOpenRouterKey: (openRouterKey: string | null) => void;
};

const OpenRouterKeySelector: FunctionComponent<OpenRouterKeySelectorProps> = ({
  openRouterKey,
  setOpenRouterKey,
}) => {
  useEffect(() => {
    const k = localStorage.getItem("openRouterKey");
    if (k) {
      setOpenRouterKey(k);
    }
  }, [setOpenRouterKey]);

  const handleChange = (e: any) => {
    const k = e.target.value;
    localStorage.setItem("openRouterKey", k);
    setOpenRouterKey(k);
  };

  return (
    <div>
      <label>Open Router Key</label>&nbsp;
      <input
        type="password"
        value={openRouterKey || ""}
        onChange={handleChange}
      />
    </div>
  );
};

export class Logger {
  #callbacks: ((title: string, message: string) => void)[] = [];
  log(title: string, message: string) {
    for (const cb of this.#callbacks) {
      cb(title, message);
    }
  }
  addCallback(cb: (title: string, message: string) => void) {
    this.#callbacks.push(cb);
  }
}

export default TestPage;
