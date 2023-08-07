import h5wasm from "./h5wasm/hdf5_hl.js";

const globalFiles = {}
const globalGroupCache = {}
const globalDatasetCache = {}

const initializeIfNeeded = async (url, chunkSize) => {
    if (globalFiles[url + '|' + chunkSize]) {
        return
    }
    const {FS} = await h5wasm.ready

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

    // compute hash of url + '|' + chunkSize
    const hash = (url + '|' + chunkSize).split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)
    const fname = `${hash}.h5`
    FS.createLazyFile('/', fname, url, true, false, headResponseHeaders, chunkSize);

    const file = new h5wasm.File(fname);
    globalFiles[url + '|' + chunkSize] = file
}

const smallChunkSize = 1024 * 20

const getGroup = async (url, path, chunkSize) => {
    const kk = `${url}|${path}`
    if (globalGroupCache[kk]) {
        return globalGroupCache[kk]
    }
    await initializeIfNeeded(url, chunkSize)
    const file = globalFiles[url + '|' + chunkSize]
    if (!file) {
        throw new Error('unexpected: file not initialized')
    }
    const group = file.get(path)
    if (!group) {
        return undefined
    }
    const subgroups = []
    const datasets = []
    for (const item of group.items()) {
        const subName = item[0]
        const x = item[1]
        if (x.type === 'Group') {
            const subgroupAttrs = {}
            for (let attributeKey in x.attrs) {
                subgroupAttrs[attributeKey] = x.attrs[attributeKey].value
            }
            subgroups.push({
                name: subName,
                path: x.path,
                attrs: subgroupAttrs
            })
        }
        else if (x.type === 'Dataset') {
            const datasetAttrs = {}
            for (let attributeKey in x.attrs) {
                datasetAttrs[attributeKey] = x.attrs[attributeKey].value
            }
            datasets.push({
                name: subName,
                path: x.path,
                shape: x.shape,
                dtype: x.dtype,
                attrs: datasetAttrs
            })
        }
    }
    const attrs = {}
    for (let attributeKey in group.attrs) {
        attrs[attributeKey] = group.attrs[attributeKey].value
    }
    const group0 = {
        path,
        subgroups,
        datasets,
        attrs
    }
    globalGroupCache[kk] = group0
    return group0
}

const getDataset = async (url, path, chunkSize) => {
    const kk = `${url}|${path}|${chunkSize}`
    if (globalDatasetCache[kk]) {
        return globalDatasetCache[kk]
    }
    await initializeIfNeeded(url, chunkSize)
    const file = globalFiles[url + '|' + chunkSize]
    if (!file) {
        throw new Error('unexpected: file not initialized')
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
        if (req.type === 'getGroup') {
            let group
            try {
                group = await getGroup(req.url, req.path, req.chunkSize || smallChunkSize)
            }
            catch (e) {
                sendResponse({
                    success: false,
                    error: e.message
                })
                return
            }
            if (!group) {
                sendResponse({
                    success: false,
                    error: `Group not found: ${req.path || '<undefined>'}`
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
                dataset = await getDataset(req.url, req.path, req.chunkSize || smallChunkSize)
            }
            catch (e) {
                sendResponse({
                    success: false,
                    error: e.message
                })
                return
            }
            const attrs = {}
            for (let attributeKey in dataset.attrs) {
                attrs[attributeKey] = dataset.attrs[attributeKey].value
            }
            const ds0 = {
                path: req.path,
                attrs,
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
                const dataset = await getDataset(req.url, req.path, req.chunkSize || smallChunkSize)
                if (req.slice) {
                    // if (req.slice.length === 2) {
                    //     data = read_slice_one_column_at_a_time(dataset, req.slice)
                    // }
                    // else {
                    data = dataset.slice(req.slice)
                    // }
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

// const read_slice_one_column_at_a_time = (dataset, slice) => {
//     const columns = []
//     for (let c = slice[1][0]; c < slice[1][1]; c++) {
//         const slice0 = [slice[0], [c, c + 1]]
//         const data = dataset.slice(slice0)
//         columns.push(data)
//     }
//     // concatenate columns, each is of type Float32Array | Float64Array | Int8Array | Int16Array | Int32Array | Uint8Array | Uint16Array | Uint32Array
//     const dtype = columns[0].constructor
//     const n = columns[0].length
//     const data = new dtype(n * columns.length)
//     for (let ic = 0; ic < columns.length; ic++) {
//         const column = columns[ic]
//         for (let i = 0; i < n; i++) {
//             data[ic + i * columns.length] = column[i]
//         }
//     }
//     return data
// }