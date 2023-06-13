import { BrowserRouter } from 'react-router-dom'
import GithubAuthSetup from './GithubAuth/GithubAuthSetup'
import MainWindow from './MainWindow'
import SetupRtcshare from './rtcshare/SetupRtcshare'

function App() {
  return (
    <GithubAuthSetup>
      <BrowserRouter>
        <SetupRtcshare>
          <MainWindow />
        </SetupRtcshare>
      </BrowserRouter>
    </GithubAuthSetup>
  )
}

export default App
