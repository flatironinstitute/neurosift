import { useCallback, useEffect, useMemo, useState } from 'react'
import { getGitHubTokenInfoFromLocalStorage, setGitHubTokenInfoToLocalStorage } from './getGithubAuthFromLocalStorage'
import { GithubAuthData } from './GithubAuthContext'

type GithubLoginStatus ={
	status: 'checking' | 'logged-in' | 'not-logged-in'
	accessToken?: string
    isPersonalAccessToken?: boolean
}

const initialTokenInfo = getGitHubTokenInfoFromLocalStorage()
const initialUserName = initialTokenInfo?.userId
const initialLoginStatus: GithubLoginStatus = initialTokenInfo?.userId && initialTokenInfo.token ? (
	{status: 'logged-in', accessToken: initialTokenInfo.token, isPersonalAccessToken: initialTokenInfo.isPersonalAccessToken}
) : {status: 'checking'}
export const initialGithubAuth = {
	userId: initialUserName,
	accessToken: initialLoginStatus.accessToken
}

const queryParams = parseQuery(window.location.href)
const adminMode = queryParams['admin'] === '1'

const useSetupGithubAuth = (): GithubAuthData => {
    const [loginStatus, setLoginStatus] = useState<GithubLoginStatus>(initialLoginStatus)
    const [userName, setUserName] = useState(initialUserName)
    useEffect(() => {
		// polling
		const intervalId = setInterval(() => {
			const tokenInfo = getGitHubTokenInfoFromLocalStorage()
			if (tokenInfo?.token) {
				setLoginStatus({
					status: 'logged-in',
					accessToken: tokenInfo.token,
                    isPersonalAccessToken: tokenInfo.isPersonalAccessToken
				})
			}
			else {
				setLoginStatus({
					status: 'not-logged-in'
				})
			}
		}, 1000)
		return () => {
			clearInterval(intervalId)
		}
	}, [])
    useEffect(() => {
		if (loginStatus.accessToken) {
			const tokenInfo = getGitHubTokenInfoFromLocalStorage()
			const u = tokenInfo?.userId
			const elapsed = Date.now() - (tokenInfo?.userIdTimestamp || 0)
			if ((u) && (elapsed < 1000 * 60 * 10)) {
				setUserName(u)
			}
			else {
				fetch(`https://api.github.com/user`, {
					headers: {
						Authorization: `token ${loginStatus.accessToken}`
					}
				}).then(resp => {
					if (resp.status === 200) {
						return resp.json()
					}
					else {
						throw Error(`Error ${resp.status}`)
					}
				}).then(resp => {
					setGitHubTokenInfoToLocalStorage({
						...tokenInfo,
						userId: 'github|' + resp.login,
						userIdTimestamp: Date.now()
					})
					setUserName('github|' + resp.login)
				}).catch(err => {
					console.warn(err.message)
					setGitHubTokenInfoToLocalStorage({})
					setLoginStatus({
						status: 'not-logged-in'
					})
				})
				// axios.get(`https://api.github.com/user`, {headers: {Authorization: `token ${loginStatus.accessToken}`}}).then(resp => {
				// 	setGitHubTokenInfoToLocalStorage({
				// 		...tokenInfo,
				// 		userId: resp.data.login,
				// 		userIdTimestamp: Date.now()
				// 	})
				// 	setUserName(resp.data.login)
				// })
			}
		}
		else {
			setUserName(undefined)
		}
	}, [loginStatus.accessToken])

    const clearAccessToken = useCallback(() => {
        setGitHubTokenInfoToLocalStorage({})
    }, [])

    return useMemo(() => ({
        signedIn: loginStatus.status === 'logged-in',
        userId: adminMode ? `admin|${userName}` : userName,
        accessToken: loginStatus.accessToken,
        isPersonalAccessToken: loginStatus.isPersonalAccessToken,
        loginStatus: loginStatus.status,
        clearAccessToken
    }), [clearAccessToken, loginStatus.accessToken, loginStatus.isPersonalAccessToken, loginStatus.status, userName])
}

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

export default useSetupGithubAuth