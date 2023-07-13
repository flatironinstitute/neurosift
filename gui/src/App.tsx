import { BrowserRouter } from 'react-router-dom'
import GithubAuthSetup from './GithubAuth/GithubAuthSetup'
import MainWindow from './MainWindow'
import SetupRtcshare from './rtcshare/SetupRtcshare'
import SetupRtcshareConnection from './RtcshareConnection/SetupRtcshareConnection'

function App() {
  return (
    <GithubAuthSetup>
      <BrowserRouter>
        <SetupRtcshare>
          <SetupRtcshareConnection>
            <MainWindow />
          </SetupRtcshareConnection>
        </SetupRtcshare>
      </BrowserRouter>
    </GithubAuthSetup>
  )
}

export default App
