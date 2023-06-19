import { FunctionComponent } from "react";
import ApplicationBar, { applicationBarHeight } from "./ApplicationBar";
import GitHubAuthPage from "./GitHub/GitHubAuthPage";
import { SetupTimeseriesSelection } from "./package/context-timeseries-selection";
import AboutPage from "./pages/AboutPage/AboutPage";
import BrowsePage from "./pages/BrowsePage/BrowsePage";
import { SetupOpenTabs } from "./pages/BrowsePage/OpenTabsContext";
import HomePage from "./pages/HomePage/HomePage";
import useRoute from "./useRoute";
import useWindowDimensions from "./useWindowDimensions";

type Props = {
    // none
}

const MainWindow: FunctionComponent<Props> = () => {
    const {route} = useRoute()
    const {width, height} = useWindowDimensions()
    return (
        <div style={{position: 'absolute', width, height}}>
            <div style={{position: 'absolute', width, height: applicationBarHeight}}>
                <ApplicationBar />
            </div>
            <div style={{position: 'absolute', top: applicationBarHeight, width, height: height - applicationBarHeight}}>
                {
                    route.page === 'home' ? (
                        <HomePage width={width} height={height - applicationBarHeight} />
                    ) : route.page === 'about' ? (
                        <AboutPage width={width} height={height - applicationBarHeight} />
                    ) : route.page === 'browse' ? (
                        <SetupOpenTabs>
                            <SetupTimeseriesSelection>
                                <BrowsePage folder={route.folder} width={width} height={height - applicationBarHeight} />
                            </SetupTimeseriesSelection>
                        </SetupOpenTabs>
                    ) : route.page === 'github-auth' ? (
                        <GitHubAuthPage />
                    ) : (
                        <div>404</div>
                    )
                }
            </div>
        </div>
    )
}

export default MainWindow