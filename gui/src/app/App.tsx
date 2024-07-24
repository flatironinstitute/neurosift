import { useReducer } from 'react'
import { BrowserRouter } from 'react-router-dom'
import MainWindow from './MainWindow'
import { CustomStatusBarElementsContext, customStatusBarElementsReducer } from './StatusBar'
import { SetupNeurosiftAnnotationsProvider } from './NeurosiftAnnotations/useNeurosiftAnnotations'

function App() {
  const [customStatusBarStrings, customStatusBarStringsDispatch] = useReducer(customStatusBarElementsReducer, {})
  return (
    <BrowserRouter>
        <CustomStatusBarElementsContext.Provider value={{customStatusBarElements: customStatusBarStrings, customStatusBarElementsDispatch: customStatusBarStringsDispatch}}>
          <SetupNeurosiftAnnotationsProvider>
            <MainWindow />
          </SetupNeurosiftAnnotationsProvider>
        </CustomStatusBarElementsContext.Provider>
    </BrowserRouter>
  )
}

export default App
