import { useReducer } from "react";
import { BrowserRouter } from "react-router-dom";
import MainWindow from "./MainWindow";
import {
  CustomStatusBarElementsContext,
  customStatusBarElementsReducer,
} from "./StatusBar";
import { SetupNeurosiftAnnotationsProvider } from "./NeurosiftAnnotations/useNeurosiftAnnotations";
import { SetupNeurosiftSavedChatsProvider } from "neurosift-lib/pages/SavedChatsPage/useNeurosiftSavedChats";
import { RouteProvider } from "neurosift-lib/contexts/useRoute";
import { JupyterConnectivityProvider } from "neurosift-lib/pages/ChatPage/JupyterConnectivity";

function App() {
  const [customStatusBarStrings, customStatusBarStringsDispatch] = useReducer(
    customStatusBarElementsReducer,
    {},
  );
  return (
    <BrowserRouter>
      <CustomStatusBarElementsContext.Provider
        value={{
          customStatusBarElements: customStatusBarStrings,
          customStatusBarElementsDispatch: customStatusBarStringsDispatch,
        }}
      >
        <RouteProvider>
          <SetupNeurosiftAnnotationsProvider>
            <SetupNeurosiftSavedChatsProvider>
              <JupyterConnectivityProvider mode="jupyter-server">
                <MainWindow />
              </JupyterConnectivityProvider>
            </SetupNeurosiftSavedChatsProvider>
          </SetupNeurosiftAnnotationsProvider>
        </RouteProvider>
      </CustomStatusBarElementsContext.Provider>
    </BrowserRouter>
  );
}

export default App;
