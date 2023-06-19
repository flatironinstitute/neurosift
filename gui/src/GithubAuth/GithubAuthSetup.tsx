import React, { FunctionComponent, PropsWithChildren } from 'react';
import GithubAuthContext from './GithubAuthContext';
import useSetupGithubAuth from './useSetupGithubAuth';

const GithubAuthSetup: FunctionComponent<PropsWithChildren> = (props) => {
    const githubAuthData = useSetupGithubAuth()
    return (
        <GithubAuthContext.Provider value={githubAuthData}>
            {props.children}
        </GithubAuthContext.Provider>
    )
}

export default GithubAuthSetup