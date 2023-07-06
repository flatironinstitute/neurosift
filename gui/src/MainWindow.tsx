import { FunctionComponent } from "react";
import ApplicationBar, { applicationBarHeight } from "./ApplicationBar";
import GitHubAuthPage from "./GitHub/GitHubAuthPage";
import AboutPage from "./pages/AboutPage/AboutPage";
import BrowsePage from "./pages/BrowsePage/BrowsePage";
import { SetupOpenTabs } from "./pages/BrowsePage/OpenTabsContext";
import HomePage from "./pages/HomePage/HomePage";
import TestPage from "./pages/TestPage/TestPage";
import StatusBar, { statusBarHeight } from "./StatusBar";
import useRoute from "./useRoute";
import useWindowDimensions from "./useWindowDimensions";

type Props = {
    // none
}

const MainWindow: FunctionComponent<Props> = () => {
    const {route} = useRoute()
    const {width, height} = useWindowDimensions()
    const H = height - applicationBarHeight - statusBarHeight
    return (
        <div className="MainWindow" style={{position: 'absolute', width, height, overflow: 'hidden'}}>
            <div className="MainWindowApplicationBar" style={{position: 'absolute', width, height: applicationBarHeight, overflow: 'hidden'}}>
                <ApplicationBar />
            </div>
            <div className="MainWindowContent" style={{position: 'absolute', top: applicationBarHeight, width, height: H, overflow: 'hidden'}}>
                {
                    route.page === 'home' ? (
                        <HomePage width={width} height={H} />
                    ) : route.page === 'about' ? (
                        <AboutPage width={width} height={H} />
                    ) : route.page === 'browse' ? (
                        <SetupOpenTabs>
                            <BrowsePage folder={route.folder} width={width} height={H} />
                        </SetupOpenTabs>
                    ) : route.page === 'github-auth' ? (
                        <GitHubAuthPage />
                    ) : route.page === 'test' ? (
                        <TestPage
                            width={width}
                            height={H}
                        />
                    ) : route.page === 'nwb' ? (
                        <TestPage
                            width={width}
                            height={H}
                            url={route.url}
                        />
                    ) : (
                        <div>404</div>
                    )
                }
            </div>
            <div className="MainWindowStatusBar" style={{position: 'absolute', bottom: 0, width, height: statusBarHeight, backgroundColor: '#eee', overflow: 'hidden'}}>
                <StatusBar
                    width={width}
                    height={statusBarHeight}
                />
            </div>
        </div>
    )
}

export default MainWindow