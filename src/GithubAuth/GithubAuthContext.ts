import React from 'react'

export type GithubAuthData = {
    signedIn: boolean
    userId?: string,
    accessToken?: string
    isPersonalAccessToken?: boolean
    clearAccessToken: () => void
    loginStatus?: 'not-logged-in' | 'checking' | 'logged-in'
}

const dummyGithubAuthData: GithubAuthData = {signedIn: false, clearAccessToken: () => {}}

const GithubAuthContext = React.createContext<GithubAuthData>(dummyGithubAuthData)

export default GithubAuthContext