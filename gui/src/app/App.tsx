import { useReducer } from "react";
import { BrowserRouter } from "react-router-dom";
import MainWindow from "./MainWindow";
import {
  CustomStatusBarElementsContext,
  customStatusBarElementsReducer,
} from "./StatusBar";
import { SetupNeurosiftAnnotationsProvider } from "./NeurosiftAnnotations/useNeurosiftAnnotations";
import { SetupContextChatContext } from "./ContextChat/ContextChat";

function App() {
  const [customStatusBarStrings, customStatusBarStringsDispatch] = useReducer(
    customStatusBarElementsReducer,
    {},
  );
  return (
    <BrowserRouter>
      <SetupContextChatContext>
        <CustomStatusBarElementsContext.Provider
          value={{
            customStatusBarElements: customStatusBarStrings,
            customStatusBarElementsDispatch: customStatusBarStringsDispatch,
          }}
        >
          <SetupNeurosiftAnnotationsProvider>
            <MainWindow />
          </SetupNeurosiftAnnotationsProvider>
        </CustomStatusBarElementsContext.Provider>
      </SetupContextChatContext>
    </BrowserRouter>
  );
}

export default App;
