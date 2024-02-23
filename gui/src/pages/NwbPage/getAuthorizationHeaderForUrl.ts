const getAuthorizationHeaderForUrl = (url?: string) => {
    if (!url) return ''
    let key = ''
    if (url.startsWith('https://api-staging.dandiarchive.org/')) {
      key = localStorage.getItem('dandiStagingApiKey') || ''
    }
    else if (url.startsWith('https://api.dandiarchive.org/')) {
      key = localStorage.getItem('dandiApiKey') || ''
    }
    if (key) return 'token ' + key
    else return ''
}

export default getAuthorizationHeaderForUrl