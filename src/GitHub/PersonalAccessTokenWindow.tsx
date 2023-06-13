import { Button, Input } from "@mui/material";
import { FunctionComponent, useCallback, useState } from "react";
import { getGitHubTokenInfoFromLocalStorage, setGitHubTokenInfoToLocalStorage } from "../GithubAuth/getGithubAuthFromLocalStorage";

type Props ={
	onChange: () => void
}

const PersonalAccessTokenWindow: FunctionComponent<Props> = ({onChange}) => {
	const [newToken, setNewToken] = useState('')
	const handleNewTokenChange: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> = useCallback((e) => {
        setNewToken(e.target.value as string)
	}, [])
	const handleSubmit = useCallback(() => {
		setGitHubTokenInfoToLocalStorage({token: newToken, isPersonalAccessToken: true})
		setNewToken('')
		onChange()
	}, [newToken, onChange])

	const oldTokenInfo = getGitHubTokenInfoFromLocalStorage()

	return (
		<div>
			<p>
				To write to public GitHub repositories and to read and write from private GitHub repositories
				you will need to set a GitHub access token. This token will be stored in the local storage of your browser.
				You should create a <a href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token" target="_blank" rel="noreferrer">personal access token</a>
				&nbsp;with the least amount of permissions needed.
			</p>
			<p style={{fontWeight: 'bold'}}>
				Use the classic type <a href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token" target="_blank" rel="noreferrer">personal access token</a> with repo scope.
			</p>

			<Input title="GitHub personal access token" type="text" value={newToken} onChange={handleNewTokenChange} />
			{
				newToken && (
					<div><Button onClick={handleSubmit}>Submit</Button></div>
				)
			}
			{
				oldTokenInfo?.token ? (
					<span>
						<p style={{color: 'green'}}>GitHub access token has been set.</p>
					</span>
				) : (
					<span>
						<p style={{color: 'red'}}>GitHub access token not set.</p>
					</span>
				)
			}
		</div>
	)
}

export default PersonalAccessTokenWindow
