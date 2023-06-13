import { FunctionComponent, useEffect, useState } from "react";
import { setGitHubTokenInfoToLocalStorage } from "../GithubAuth/getGithubAuthFromLocalStorage";

type Props = any

function parseQuery(queryString: string) {
    const ind = queryString.indexOf('?')
    if (ind <0) return {}
    const query: {[k: string]: string} = {};
    const pairs = queryString.slice(ind + 1).split('&');
    for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i].split('=');
        query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
    }
    return query;
}

// Important to do it this way because it is difficult to handle special characters (especially #) by using URLSearchParams or window.location.search
const queryParams = parseQuery(window.location.href)

const GitHubAuthPage: FunctionComponent<Props> = () => {
	const [status, setStatus] = useState<'checking' | 'okay' | 'error'>('checking')
	const [error, setError] = useState<string>('')
	const code = queryParams.code
	useEffect(() => {
		(async () => {
			const rr = await fetch(`/api/githubAuth?code=${code}`)
			const r = await rr.json()
			// const resp = await axios.get(`/api/githubAuth?code=${code}`, {responseType: 'json'})
			// const r = resp.data
			if ((!r.access_token) || (r.error)) {
				setStatus('error')
				setError(r.error)
				return
			}
			setGitHubTokenInfoToLocalStorage({
				token: r.access_token,
				isPersonalAccessToken: false
			})
			setStatus('okay')
		})()
	}, [code])
	return (
		<div style={{padding: 30}}>
			{
				status === 'checking' ? (
					<div>Checking authorization</div>
				) : status === 'okay' ? (
					<div>Logged in. You may now close this window.</div>
				) : status === 'error' ? (
					<div style={{color: 'red'}}>Error: {error}</div>
				) : (
					<div>Unexpected status: {status}</div>
				)
			}
		</div>
	)
}

export default GitHubAuthPage
