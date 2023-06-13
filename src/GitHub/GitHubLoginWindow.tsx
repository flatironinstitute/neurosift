import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FunctionComponent, useCallback, useEffect, useRef, useState } from "react";
import Hyperlink from "../components/Hyperlink";
import { setGitHubTokenInfoToLocalStorage } from "../GithubAuth/getGithubAuthFromLocalStorage";
import { useGithubAuth } from "../GithubAuth/useGithubAuth";
import UserIdComponent from "../UserIdComponent";

type Props = {
    onClose?: () => void
}

const GitHubLoginWindow: FunctionComponent<Props> = ({onClose}) => {
    const {userId, signedIn} = useGithubAuth()
    const initialSignedIn = useRef<boolean | undefined>(undefined)
    useEffect(() => {
        if (initialSignedIn.current === undefined) {
            initialSignedIn.current = signedIn
            return
        }
        if (initialSignedIn.current !== signedIn) {
            onClose?.()
        }
    }, [signedIn, onClose])
    if (userId) {
        return <LoggedInComponent onClose={onClose} />
    }
    else {
        return <NotLoggedInComponent onClose={onClose} />
    }
}

const LoggedInComponent: FunctionComponent<Props> = ({onClose}) => {
    const {userId, isPersonalAccessToken, clearAccessToken} = useGithubAuth()
    const ghIcon = <FontAwesomeIcon icon={faGithub} />
    return (
        <div>
            <h2>Logged in as <UserIdComponent userId={userId} /></h2>
            <hr />
            {
                isPersonalAccessToken ? (
                    <div>
                        <div>{ghIcon} You are using a GitHub personal access token.</div>
                        <div>&nbsp;</div>
                        <div>
                            <Hyperlink onClick={() => clearAccessToken()}>Log out by clearing access token.</Hyperlink>
                        </div>
                        <div>&nbsp;</div>
                        <div>
							<Hyperlink href="https://github.com/settings/developers" target="_blank">Revoke or manage personal access token.</Hyperlink>
						</div>
                    </div>
                ) : (
                    <div>
                        <div>{ghIcon} You are using GitHub OAuth.</div>
                        <div>&nbsp;</div>
                        <div>
                            <Hyperlink onClick={() => clearAccessToken()}>Log out by clearing access token.</Hyperlink>
                        </div>
                        <div>&nbsp;</div>
                        <div>
                            <Hyperlink href="https://github.com/settings/applications" target="_blank" color="gray">Revoke or manage access.</Hyperlink>
                        </div>
                    </div>
                )
            }
            <hr />
            <div><button onClick={onClose}>Close</button></div>
        </div>
    )
}

const NotLoggedInComponent: FunctionComponent<Props> = ({onClose}) => {
    const [mode, setMode] = useState<'github' | 'personal-access-token'>('github')
    const [personalAccessToken, setPersonalAccessToken] = useState<string>('')
    const ghIcon = <FontAwesomeIcon icon={faGithub} />
    const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID

    const submitPersonalAccessToken = useCallback(() => {
        if (!personalAccessToken) return
        setGitHubTokenInfoToLocalStorage({token: personalAccessToken, isPersonalAccessToken: true})
    }, [personalAccessToken])

    return (
        <div>
            <h2>Not logged in</h2>
            <hr />
            <div onClick={() => setMode('github')} style={{cursor: 'pointer'}}>
                <input type="radio" checked={mode === 'github'} onChange={() => {}} />&nbsp;
                {/* <a
                    href={
                        `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}`
                    }
                    target="_blank"
                    rel="noreferrer"
                >{ghIcon} Log in using GitHub</a> */}
                <a
                    onClick={() => {
                        window.open(`https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}`, 'Login with GitHub', 'width=600,height=600')
                    }}
                    style={{cursor: 'pointer', textDecoration: 'underline'}}
                >{ghIcon} Log in using GitHub</a>
            </div>
            <div>&nbsp;</div>
            <div onClick={() => setMode('personal-access-token')} style={{cursor: 'pointer'}}>
                <input type="radio" checked={mode === 'personal-access-token'} onChange={() => {}} /> Use GitHub personal access token
            </div>
            {
                mode === 'personal-access-token' && (
                    <div>
                        <div>&nbsp;</div>
                        <div>
                            <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer">Create a personal access token</a> (classic type) and paste it here:
                        </div>
                        <div>&nbsp;</div>
                        <div><input type="text" value={personalAccessToken} onChange={e => setPersonalAccessToken(e.target.value as string)} />&nbsp;
                        <button disabled={!personalAccessToken} onClick={submitPersonalAccessToken}>Submit</button></div>
                        <div>&nbsp;</div>
                        <div><a href="https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token" target="_blank" rel="noreferrer">Learn more about GitHub personal access tokens</a></div>
                    </div>
                )
            }
            <hr />
            <div><button onClick={onClose}>Close</button></div>
        </div>
    )
}

export default GitHubLoginWindow
