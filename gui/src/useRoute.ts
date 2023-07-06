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
    page: 'test'
} | {
    page: 'nwb'
    url: string
} | {
    page: 'github-auth'
}

const useRoute = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const p = location.pathname
    const search = location.search
    const route: Route = useMemo(() => {
        if (p === '/about') {
            return {
                page: 'about'
            }
        }
        else if (p.startsWith('/b/') || (p === '/b') || (p.startsWith('/browse/') || (p === '/browse'))) {
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
        else if (p === '/test') {
            return {
                page: 'test'
            }
        }
        else if (p === '/nwb') {
            const query = parseSearchString(location.search)
            return {
                page: 'nwb',
                url: query.url
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
            navigate(`/b/${r.folder}` + location.search)
        }
        else if (r.page === 'github-auth') {
            navigate('/github/auth' + location.search)
        }
        else if (r.page === 'test') {
            navigate('/test' + location.search)
        }
        else if (r.page === 'nwb') {
            navigate(`/nwb?url=` + r.url)
        }
    }, [navigate, location.search])

    return {
        route,
        setRoute
    }    
}

const parseSearchString = (search: string) => {
    const query: { [key: string]: string } = {}
    const a = search.slice(1).split('&')
    for (const s of a) {
        const b = s.split('=')
        query[b[0]] = b[1]
    }
    return query
}

export default useRoute