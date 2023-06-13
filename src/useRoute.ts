import { useCallback, useMemo } from "react"
import { useLocation, useNavigate } from "react-router-dom"

export type Route = {
    page: 'home'
} | {
    page: 'about'
} | {
    page: 'browse'
    folder: string
} | {
    page: 'github-auth'
}

const useRoute = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const p = location.pathname
    const route: Route = useMemo(() => {
        if (p === '/about') {
            return {
                page: 'about'
            }
        }
        else if (p.startsWith('/browse/') || (p === '/browse')) {
            const a = p.split('/')
            const folder = a.slice(2).join('/')
            return {
                page: 'browse',
                folder
            }
        }
        else if (p === '/github/auth') {
            return {
                page: 'github-auth'
            }
        }
        else {
            return {
                page: 'home'
            }
        }
    }, [p])

    const setRoute = useCallback((r: Route) => {
        if (r.page === 'home') {
            navigate('/' + location.search)
        }
        else if (r.page === 'about') {
            navigate('/about' + location.search)
        }
        else if (r.page === 'browse') {
            navigate(`/browse/${r.folder}` + location.search)
        }
        else if (r.page === 'github-auth') {
            navigate('/github/auth' + location.search)
        }
    }, [navigate, location.search])

    return {
        route,
        setRoute
    }    
}

export default useRoute