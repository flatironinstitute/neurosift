import validateObject, { isBoolean, isNumber, isString, optional } from "../types/validateObject"

export type GitHubTokenInfo = {
    token?: string
    userId?: string
    userIdTimestamp?: number
    isPersonalAccessToken?: boolean
}

export const isGithubTokenInfo = (x: any): x is GitHubTokenInfo => {
    return validateObject(x, {
        token: optional(isString),
        userId: optional(isString),
        userIdTimestamp: optional(isNumber),
        isPersonalAccessToken: optional(isBoolean)
    })
}

export const setGitHubTokenInfoToLocalStorage = (tokenInfo: GitHubTokenInfo) => {
    localStorage.setItem('githubToken', JSON.stringify(tokenInfo))
}

export const getGitHubTokenInfoFromLocalStorage = (): GitHubTokenInfo | undefined => {
    const a = localStorage.getItem('githubToken')
    if (!a) return undefined
    try {
        const b = JSON.parse(a)
        if (isGithubTokenInfo(b)) {
            return b
        }
        else {
            console.warn(b)
            console.warn('Invalid GitHub token info.')
            localStorage.removeItem('githubToken')
            return undefined
        }
    }
    catch {
        console.warn(a)
        console.warn('Error with github token info.')
        return undefined
    }
}