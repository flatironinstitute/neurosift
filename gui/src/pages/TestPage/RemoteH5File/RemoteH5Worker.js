import h5wasm from "./h5wasm/hdf5_hl.js";

const globalFiles = {}
const globalGroupCache = {}
const globalDatasetCache = {}

const getGroup = (url, path) => {
    const kk = `${url}|${path}`
    if (globalGroupCache[kk]) {
        return globalGroupCache[kk]
    }
    const file = globalFiles[url]
    if (!file) {
        throw new Error('file not initialized')
    }
    const group = file.get(path)
    if (!group) {
        throw new Error('group not found')
    }
    const groups = []
    const datasets = []
    for (const item of group.items()) {
        const subName = item[0]
        const x = item[1]
        if (x.type === 'Group') {
            groups.push({
                name: subName,
                path: x.path
            })
        }
        else if (x.type === 'Dataset') {
            datasets.push({
                name: subName,
                path: x.path
            })
        }
    }
    const group0 = {
        path,
        groups,
        datasets
    }
    globalGroupCache[kk] = group0
    return group0
}

const getDataset = (url, path) => {
    const kk = `${url}|${path}`
    if (globalDatasetCache[kk]) {
        return globalDatasetCache[kk]
    }
    const file = globalFiles[url]
    if (!file) {
        throw new Error('file not initialized')
    }
    const dataset = file.get(path)
    if (!dataset) {
        throw new Error(`Dataset not found: ${path}`)
    }
    globalDatasetCache[kk] = dataset
    return dataset
}


self.onmessage = function (e) {
    const d = e.data
    const handleRequest = async (d) => {
        const req = d.request
        const sendResponse = (response) => {
            self.postMessage({
                type: 'response',
                requestId: d.requestId,
                response
            })
        }
        if (req.type === 'initialize') {
            const {FS} = await h5wasm.ready

            const url = req.url
            const controller = new AbortController();
            const signal = controller.signal;
            const response = await fetch(url, { signal }) // this is the only reason we need this function to be async
            const headResponseHeaders = {
                "Content-length": response.headers.get("Content-length"),
                // "Accept-Ranges": response.headers.get("Accept-Ranges"),
                "Accept-Ranges": "bytes", // force this for now
                "Content-Encoding": response.headers.get("Content-Encoding"),
            }
            controller.abort();

            // compute hash of url
            const hash = url.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)
            const fname = `${hash}.h5`
            FS.createLazyFile('/', fname, url, true, false, headResponseHeaders);

            const file = new h5wasm.File(fname);
            globalFiles[url] = file
            sendResponse({
                success: true
            })
        }
        else if (req.type === 'getGroup') {
            let group
            try {
                group = getGroup(req.url, req.path)
            }
            catch (e) {
                sendResponse({
                    success: false,
                    error: e.message
                })
                return
            }
            sendResponse({
                success: true,
                group
            })
        }
        else if (req.type === 'getDataset') {
            let dataset
            try {
                dataset = getDataset(req.url, req.path)
            }
            catch (e) {
                sendResponse({
                    success: false,
                    error: e.message
                })
                return
            }
            const ds0 = {
                path: req.path,
                attrs: dataset.attrs,
                dtype: dataset.dtype,
                shape: dataset.shape
            }
            sendResponse({
                success: true,
                dataset: ds0
            })
        }
        else if (req.type === 'getDatasetData') {
            let data
            try {
                const dataset = getDataset(req.url, req.path)
                if (req.slice) {
                    data = dataset.slice(req.slice)
                }
                else {
                    data = dataset.value
                }
            }
            catch (e) {
                sendResponse({
                    success: false,
                    error: e.message
                })
                return
            }
            sendResponse({
                success: true,
                data
            })
        }
    }
    if (d.type === 'request') {
        handleRequest(d)
    }
}