import { useReducer } from 'react'
import { BrowserRouter } from 'react-router-dom'
import GithubAuthSetup from './GithubAuth/GithubAuthSetup'
import MainWindow from './MainWindow'
import { CustomStatusBarStringsContext, customStatusBarStringsReducer } from './StatusBar'

function App() {
  const [customStatusBarStrings, customStatusBarStringsDispatch] = useReducer(customStatusBarStringsReducer, {})
  return (
    <GithubAuthSetup>
      <BrowserRouter>
          <CustomStatusBarStringsContext.Provider value={{customStatusBarStrings, customStatusBarStringsDispatch}}>
            <MainWindow />
          </CustomStatusBarStringsContext.Provider>
      </BrowserRouter>
    </GithubAuthSetup>
  )
}

export default App
