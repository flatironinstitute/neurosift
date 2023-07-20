import { useReducer } from 'react'
import { BrowserRouter } from 'react-router-dom'
import GithubAuthSetup from './GithubAuth/GithubAuthSetup'
import MainWindow from './MainWindow'
import SetupRtcshare from './rtcshare/SetupRtcshare'
import SetupRtcshareConnection from './RtcshareConnection/SetupRtcshareConnection'
import { CustomStatusBarStringsContext, customStatusBarStringsReducer } from './StatusBar'

function App() {
  const [customStatusBarStrings, customStatusBarStringsDispatch] = useReducer(customStatusBarStringsReducer, {})
  return (
    <GithubAuthSetup>
      <BrowserRouter>
        <SetupRtcshare>
          <SetupRtcshareConnection>
            <CustomStatusBarStringsContext.Provider value={{customStatusBarStrings, customStatusBarStringsDispatch}}>
              <MainWindow />
            </CustomStatusBarStringsContext.Provider>
          </SetupRtcshareConnection>
        </SetupRtcshare>
      </BrowserRouter>
    </GithubAuthSetup>
  )
}

export default App
