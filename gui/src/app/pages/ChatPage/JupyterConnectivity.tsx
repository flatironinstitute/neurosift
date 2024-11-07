import {
  createContext,
  FunctionComponent,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type JupyterConnectivityState = {
  jupyterUrl: string;
  jupyterIsConnected: boolean;
  refreshJupyter: () => void;
  changeJupyterUrl: () => void;
};

const JupyterConnectivityContext = createContext<JupyterConnectivityState>({
  jupyterUrl: "",
  jupyterIsConnected: false,
  refreshJupyter: () => {},
  changeJupyterUrl: () => {},
});

export const JupyterConnectivityProvider: FunctionComponent<
  PropsWithChildren
> = ({ children }) => {
  const [jupyterUrl, setJupyterUrl] = useState("");
  useEffect(() => {
    const localStorageKey = "jupyter-url";
    const storedJupyterUrl = localStorage.getItem(localStorageKey);
    setJupyterUrl(storedJupyterUrl || "http://localhost:8888");
  }, []);
  const [jupyterIsConnected, setJupyterIsConnected] = useState(false);
  const check = useCallback(async () => {
    try {
      const resp = await fetch(`${jupyterUrl}/api/sessions`);
      if (resp.ok) {
        setJupyterIsConnected(true);
      } else {
        setJupyterIsConnected(false);
      }
    } catch {
      setJupyterIsConnected(false);
    }
  }, [jupyterUrl]);
  const [refreshCode, setRefreshCode] = useState(0);
  useEffect(() => {
    check();
  }, [check, refreshCode, jupyterUrl]);
  const refreshJupyter = useCallback(() => setRefreshCode((c) => c + 1), []);
  const changeJupyterUrl = useCallback(() => {
    const newUrl = prompt("Enter the URL of your Jupyter runtime", jupyterUrl);
    if (newUrl) {
      localStorage.setItem("jupyterUrl", newUrl);
      setJupyterUrl(newUrl);
      setRefreshCode((c) => c + 1);
    }
  }, [jupyterUrl]);
  return (
    <JupyterConnectivityContext.Provider
      value={{
        jupyterUrl,
        jupyterIsConnected,
        refreshJupyter,
        changeJupyterUrl,
      }}
    >
      {children}
    </JupyterConnectivityContext.Provider>
  );
};

export const useJupyterConnectivity = () => {
  const context = useContext(JupyterConnectivityContext);
  if (!context) {
    throw new Error(
      "useJupyterConnectivity must be used within a JupyterConnectivityProvider",
    );
  }
  return context;
};
