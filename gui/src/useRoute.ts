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
    url: string[]
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
        if (typeof p !== 'string') {
            console.warn('Unexpected type for p', typeof p)
            return {
                page: 'home'
            }
        }
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
                url: typeof query.url === 'string' ? [query.url] : query.url
            }
        }
        // no longer supported
        // else if (p === '/avi') {
        //     return {
        //         page: 'avi',
        //         url: query.url
        //     }
        // }
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
        // no longer supported
        // else if (r.page === 'avi') {
        //     newQuery.p = '/avi'
        //     newQuery.url = r.url
        // }
        const newSearch = queryToQueryString(newQuery)
        navigate(location.pathname + newSearch)
    }, [navigate, location.pathname, query])

    return {
        route,
        setRoute
    }    
}

const parseSearchString = (search: string) => {
    const query: { [key: string]: string | string[] } = {}
    const a = search.slice(1).split('&')
    for (const s of a) {
        const b = s.split('=')
        const key = b[0]
        const value = b[1]
        if ((key in query) && (query[key])) {
            if (Array.isArray(query[key])) {
                (query[key] as string[]).push(value)
            }
            else if (typeof query[key] === 'string') {
                query[key] = [query[key] as string, value]
            }
            else {
                console.warn('Unexpected query[key] type in parseSearchString', typeof query[key])
            }
        }
        else {
            query[key] = value
        }
    }
    return query
}

const queryToQueryString = (query: { [key: string]: string | string[] }) => {
    const a: string[] = []
    for (const key in query) {
        if (query[key]) {
            if (Array.isArray(query[key])) {
                for (const value of (query[key] as string[])) {
                    a.push(`${key}=${value}`)
                }
            }
            else if (typeof query[key] === 'string') {
                a.push(`${key}=${query[key]}`)
            }
            else {
                console.warn('Unexpected query[key] type in queryToQueryString', typeof query[key])
            }
        }
    }
    return '?' + a.join('&')
}

export default useRoute