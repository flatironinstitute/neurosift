import { HashRouter } from 'react-router-dom'
import GithubAuthSetup from './GithubAuth/GithubAuthSetup'
import MainWindow from './MainWindow'
import SetupRtcshare from './rtcshare/SetupRtcshare'
import SetupRtcshareConnection from './RtcshareConnection/SetupRtcshareConnection'

function App() {
  return (
    <GithubAuthSetup>
      <HashRouter>
        <SetupRtcshare>
          <SetupRtcshareConnection>
            <MainWindow />
          </SetupRtcshareConnection>
        </SetupRtcshare>
      </HashRouter>
    </GithubAuthSetup>
  )
}

export default App
