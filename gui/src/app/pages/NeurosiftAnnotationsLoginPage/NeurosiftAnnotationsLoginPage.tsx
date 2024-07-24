import { FunctionComponent, useEffect } from 'react';
import useRoute from '../../useRoute';

type Props = {
    //
}

const NeurosiftAnnotationsLoginPage: FunctionComponent<Props> = () => {
    const {route, setRoute} = useRoute()
    if (route.page !== 'neurosift-annotations-login') throw new Error('wrong page')
    useEffect(() => {
        if (route.accessToken) {
            localStorage.setItem('neurosift-annotations-access-token', route.accessToken)
            setRoute({page: 'neurosift-annotations-login', accessToken: ''}, true)
        }
    }, [route, setRoute])

    const savedAccessToken = localStorage.getItem('neurosift-annotations-access-token')

    if ((savedAccessToken) && (!route.accessToken)) {
        return (
            <div>
                You are logged in to Neurosift Annotations. You may close this window.
            </div>
        )
    }
    else if (route.accessToken) {
        return (
            <div>
                Logging in to Neurosift Annotations...
            </div>
        )
    }
    else {
        return (
            <div>
                You are not logged in to Neurosift Annotations. Something probably went wrong.
            </div>
        )
    }
}

export default NeurosiftAnnotationsLoginPage;
