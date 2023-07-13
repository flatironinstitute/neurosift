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
    const search = location.search
    const query = useMemo(() => (parseSearchString(search)), [search])
    const p = query.p || '/'
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
    }, [p, query])

    const setRoute = useCallback((r: Route) => {
        let newQuery = {...query}
        if (r.page === 'home') {
            newQuery = {p: '/'}    
        }
        else if (r.page === 'about') {
            newQuery = {p: '/about'}
        }
        else if (r.page === 'browse') {
            newQuery.p = '/b/' + r.folder
        }
        else if (r.page === 'test') {
            newQuery.p = '/test'
        }
        else if (r.page === 'nwb') {
            newQuery.p = '/nwb'
            newQuery.url = r.url
        }
        const newSearch = queryToQueryString(newQuery)
        navigate(location.pathname + newSearch)
    }, [navigate, location.pathname, query])

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

const queryToQueryString = (query: { [key: string]: string }) => {
    const a: string[] = []
    for (const key in query) {
        a.push(`${key}=${query[key]}`)
    }
    return '?' + a.join('&')
}

export default useRoute