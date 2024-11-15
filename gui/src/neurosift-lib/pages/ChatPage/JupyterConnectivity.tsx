import {
  createContext,
  FunctionComponent,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type JupyterConnectivityState = {
  mode: "jupyter-server" | "jupyterlab-extension";
  jupyterServerUrl: string;
  jupyterServerIsAvailable: boolean;
  refreshJupyter: () => void;
  changeJupyterServerUrl: () => void;
  extensionKernel?: any;
};

const JupyterConnectivityContext = createContext<JupyterConnectivityState>({
  mode: "jupyter-server",
  jupyterServerUrl: "http://localhost:8888",
  jupyterServerIsAvailable: false,
  refreshJupyter: () => {},
  changeJupyterServerUrl: () => {},
  extensionKernel: undefined,
});

export const JupyterConnectivityProvider: FunctionComponent<
  PropsWithChildren<{
    mode: "jupyter-server" | "jupyterlab-extension";
    extensionKernel?: any;
  }>
> = ({ children, mode, extensionKernel }) => {
  const [jupyterServerUrl, setJupyterServerUrl] = useState("");
  useEffect(() => {
    const localStorageKey = "jupyter-server-url";
    const storedJupyterServerUrl = localStorage.getItem(localStorageKey);
    setJupyterServerUrl(storedJupyterServerUrl || "http://localhost:8888");
  }, []);
  const [jupyterServerIsAvailable, setJupyterServerIsAvailable] =
    useState(false);
  const check = useCallback(async () => {
    if (mode === "jupyter-server") {
      try {
        console.log(`Fetching ${jupyterServerUrl}/api/sessions`);
        const resp = await fetch(`${jupyterServerUrl}/api/sessions`, {
          method: "GET",
          // apparently it's import to specify the header here, otherwise it seems the header fields can violate CORS
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (resp.ok) {
          setJupyterServerIsAvailable(true);
        } else {
          setJupyterServerIsAvailable(false);
        }
      } catch {
        setJupyterServerIsAvailable(false);
      }
    } else if (mode === "jupyterlab-extension") {
      setJupyterServerIsAvailable(!!extensionKernel);
    }
  }, [jupyterServerUrl, mode, extensionKernel]);
  const [refreshCode, setRefreshCode] = useState(0);
  useEffect(() => {
    check();
  }, [check, refreshCode, jupyterServerUrl]);
  const refreshJupyter = useCallback(() => setRefreshCode((c) => c + 1), []);
  const changeJupyterServerUrl = useCallback(() => {
    const newUrl = prompt(
      "Enter the URL of your Jupyter runtime",
      jupyterServerUrl,
    );
    if (newUrl) {
      localStorage.setItem("jupyter-server-url", newUrl);
      setJupyterServerUrl(newUrl);
      setRefreshCode((c) => c + 1);
    }
  }, [jupyterServerUrl]);
  const value = useMemo(
    () => ({
      mode,
      jupyterServerUrl,
      jupyterServerIsAvailable,
      refreshJupyter,
      changeJupyterServerUrl,
      extensionKernel,
    }),
    [
      mode,
      jupyterServerUrl,
      jupyterServerIsAvailable,
      refreshJupyter,
      changeJupyterServerUrl,
      extensionKernel,
    ],
  );
  return (
    <JupyterConnectivityContext.Provider value={value}>
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

// This is important inside a hook where we don't want to depend on a state variable for the jupyter connectivity state
export const loadJupyterConnectivityStateFromLocalStorage = (
  mode: "jupyter-server" | "jupyterlab-extension",
  extensionKernel?: any,
  jupyterServerIsAvailable: boolean = false,
): JupyterConnectivityState => {
  const localStorageKey = "jupyter-server-url";
  const storedJupyterServerUrl = localStorage.getItem(localStorageKey);
  return {
    mode,
    jupyterServerUrl: storedJupyterServerUrl || "http://localhost:8888",
    jupyterServerIsAvailable,
    refreshJupyter: () => {},
    changeJupyterServerUrl: () => {},
    extensionKernel,
  };
};
