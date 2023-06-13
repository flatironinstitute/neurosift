import { useContext } from "react"
import GithubAuthContext from "./GithubAuthContext"

export const useGithubAuth = () => {
    return useContext(GithubAuthContext)
}