import { HashRouter } from 'react-router-dom'
import GithubAuthSetup from './GithubAuth/GithubAuthSetup'
import MainWindow from './MainWindow'
import SetupRtcshare from './rtcshare/SetupRtcshare'

function App() {
  return (
    <GithubAuthSetup>
      <HashRouter>
        <SetupRtcshare>
          <MainWindow />
        </SetupRtcshare>
      </HashRouter>
    </GithubAuthSetup>
  )
}

export default App
