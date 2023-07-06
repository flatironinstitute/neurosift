import { Login, Logout } from "@mui/icons-material";
import { AppBar, Toolbar } from "@mui/material";
import { FunctionComponent, useCallback, useMemo, useState } from "react";
import ModalWindow from "./components/ModalWindow/ModalWindow";
import GitHubLoginWindow from "./GitHub/GitHubLoginWindow";
import { useGithubAuth } from "./GithubAuth/useGithubAuth";
import UserIdComponent from "./UserIdComponent";
import useRoute from "./useRoute";

type Props = {
    // none
}

export const applicationBarHeight = 50

// tricky
const logoUrl = window.location.hostname.includes('github.io') ? (
	`/neurosift/neurosift-logo.png`
) : (
	`/neurosift-logo.png`
)

const ApplicationBar: FunctionComponent<Props> = () => {
    const {signedIn, userId} = useGithubAuth()
    const {setRoute} = useRoute()

    const onHome = useCallback(() => {
        setRoute({page: 'home'})
    }, [setRoute])

    const {visible: githubAccessWindowVisible, handleOpen: openGitHubAccessWindow, handleClose: closeGitHubAccessWindow} = useModalDialog()

    // light greenish background color for app bar
    const barColor = '#e0ffe0'

    return (
        <span>
            <AppBar position="static" style={{height: applicationBarHeight - 10, color: 'black', background: barColor}}>
                <Toolbar style={{minHeight: applicationBarHeight - 10}}>
                    <img src={logoUrl} alt="logo" height={30} style={{paddingBottom: 5, cursor: 'pointer'}} onClick={onHome} />
                    <div onClick={onHome} style={{cursor: 'pointer'}}>&nbsp;&nbsp;&nbsp;Neurosift</div>
                    <span style={{marginLeft: 'auto'}} />
                    {
                        signedIn && (
                            <span style={{fontFamily: 'courier', color: 'lightgray', cursor: 'pointer'}} title={`Signed in as ${userId}`} onClick={openGitHubAccessWindow}><UserIdComponent userId={userId} />&nbsp;&nbsp;</span>
                        )
                    }
                    {/* <span style={{paddingBottom: 0, cursor: 'pointer'}} onClick={openGitHubAccessWindow} title={signedIn ? "Manage log in" : "Log in"}>
                        {
                            signedIn ? (
                                <Logout />
                            ) : (
                                <Login />
                            )
                        }
                        &nbsp;
                        {
                            !signedIn && (
                                <span style={{position: 'relative', top: -5}}>Log in</span>
                            )
                        }
                    </span> */}
                </Toolbar>
            </AppBar>
            <ModalWindow
                open={githubAccessWindowVisible}
                // onClose={closeGitHubAccessWindow}
            >
                <GitHubLoginWindow
                    onClose={() => closeGitHubAccessWindow()}
                />
            </ModalWindow>
        </span>
    )
}

export const useModalDialog = () => {
    const [visible, setVisible] = useState<boolean>(false)
    const handleOpen = useCallback(() => {
        setVisible(true)
    }, [])
    const handleClose = useCallback(() => {
        setVisible(false)
    }, [])
    return useMemo(() => ({
        visible,
        handleOpen,
        handleClose
    }), [visible, handleOpen, handleClose])
}

export default ApplicationBar