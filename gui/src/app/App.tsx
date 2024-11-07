import { useReducer } from "react";
import { BrowserRouter } from "react-router-dom";
import MainWindow from "./MainWindow";
import {
  CustomStatusBarElementsContext,
  customStatusBarElementsReducer,
} from "./StatusBar";
import { SetupNeurosiftAnnotationsProvider } from "./NeurosiftAnnotations/useNeurosiftAnnotations";
import { SetupNeurosiftSavedChatsProvider } from "./pages/SavedChatsPage/useNeurosiftSavedChats";

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
        <SetupNeurosiftAnnotationsProvider>
          <SetupNeurosiftSavedChatsProvider>
            <MainWindow />
          </SetupNeurosiftSavedChatsProvider>
        </SetupNeurosiftAnnotationsProvider>
      </CustomStatusBarElementsContext.Provider>
    </BrowserRouter>
  );
}

export default App;
