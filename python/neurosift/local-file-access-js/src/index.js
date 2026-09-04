const express = require('express')
const fs = require('fs')
const http = require('http')
const path = require('path')

const app = express()
const port = process.env.PORT || 61762
const dirArg = process.argv[2]
if (!dirArg) {
    console.error('Please specify a directory.')
    process.exit(-1)
}
// Resolve once so that every served path can be checked against it.
const dir = path.resolve(dirArg)
console.info('Serving files in', dir)

// Allowed CORS origins. Exact-match list plus a pattern for Cloudflare Pages
// preview deploys of this repo (every branch is published as
// <branch>.neurosift.pages.dev), so `view-nwb --neurosift-url <preview>` works
// without an allowlist edit per branch.
const allowedOrigins = [
    'https://neurosift.app',
    'https://flatironinstitute.github.io',
    'http://localhost:3000',
    'http://localhost:4200',
    'http://localhost:5173',
]
const allowedOriginPatterns = [/^https:\/\/[a-z0-9-]+\.neurosift\.pages\.dev$/]
app.use((req, resp, next) => {
    const origin = req.get('origin')
    const isAllowed =
        allowedOrigins.includes(origin) ||
        (origin && allowedOriginPatterns.some((re) => re.test(origin)))
    const allowedOrigin = isAllowed ? origin : undefined
    if (allowedOrigin) {
        resp.header('Access-Control-Allow-Origin', allowedOrigin)
        resp.header('Access-Control-Allow-Headers', "Origin, X-Requested-With, Content-Type, Accept, Range")
        resp.header('Access-Control-Expose-Headers', "Content-Length, Content-Range, Accept-Ranges")
    }
    next()
})

app.options('*', (req, resp) => {
    resp.sendStatus(200)
})

// Parse a single-range Range header against a file of the given size.
// Returns { start, end } for a satisfiable range, 'unsatisfiable' when the
// range lies entirely outside the file, or undefined when the header should
// be ignored (absent, malformed, or a multi-range request), in which case
// the whole file is sent with a 200.
function parseRange(rangeHeader, fileSize) {
    if (!rangeHeader) return undefined
    const m = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim())
    if (!m) return undefined
    const [, startStr, endStr] = m
    if (startStr === '' && endStr === '') return undefined
    let start
    let end
    if (startStr === '') {
        // suffix range: the last N bytes
        const suffixLength = parseInt(endStr, 10)
        if (suffixLength === 0) return 'unsatisfiable'
        start = Math.max(0, fileSize - suffixLength)
        end = fileSize - 1
    }
    else {
        start = parseInt(startStr, 10)
        end = endStr === '' ? fileSize - 1 : Math.min(parseInt(endStr, 10), fileSize - 1)
    }
    if (start >= fileSize || start > end) return 'unsatisfiable'
    return { start, end }
}

// Map a requested file name to an absolute path inside the served directory,
// or undefined if it escapes it or is a hidden file. path.resolve handles
// '..' segments and, on Windows, backslashes, so a check on the resolved
// path covers both.
function resolveShareablePath(fileName) {
    const fullFileName = path.resolve(dir, fileName)
    if (fullFileName !== dir && !fullFileName.startsWith(dir + path.sep)) {
        return undefined
    }
    const base = path.basename(fullFileName)
    if (base.startsWith('.')) {
        if (!['.zattrs', '.zgroup', '.zarray', '.zmetadata'].includes(base)) {
            // don't show hidden files (with some exceptions)
            return undefined
        }
    }
    return fullFileName
}

// Serve files. Express runs GET handlers for HEAD as well.
app.get('/files/:fileName(*)', async (req, resp) => {
    const fileName = req.params.fileName
    const fullFileName = resolveShareablePath(fileName)
    if (!fullFileName) {
        console.warn('Access to this file is forbidden.', fileName)
        resp.status(403).type('text/plain').send('Access to this file is forbidden.')
        return
    }

    let stats
    try {
        stats = await fs.promises.stat(fullFileName)
    }
    catch (err) {
        if (err.code === 'ENOENT' || err.code === 'ENOTDIR') {
            resp.status(404).type('text/plain').send('File not found.')
        }
        else {
            console.error(err)
            resp.status(500).type('text/plain').send('Unable to read file.')
        }
        return
    }
    if (!stats.isFile()) {
        resp.status(404).type('text/plain').send('File not found.')
        return
    }
    const fileSize = stats.size

    const range = parseRange(req.headers.range, fileSize)
    if (range === 'unsatisfiable') {
        resp.status(416).set({
            'Content-Range': `bytes */${fileSize}`,
            'Accept-Ranges': 'bytes',
        }).end()
        return
    }

    let status
    let head
    let streamOptions
    if (range) {
        const { start, end } = range
        status = 206
        head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': end - start + 1,
            'Content-Type': 'application/octet-stream',
        }
        streamOptions = { start, end }
    }
    else {
        status = 200
        head = {
            'Accept-Ranges': 'bytes',
            'Content-Length': fileSize,
            'Content-Type': 'application/octet-stream',
        }
        streamOptions = {}
    }

    if (req.method === 'HEAD') {
        resp.writeHead(status, head)
        resp.end()
        return
    }

    const file = fs.createReadStream(fullFileName, streamOptions)
    file.on('open', () => {
        resp.writeHead(status, head)
        file.pipe(resp)
    })
    file.on('error', (err) => {
        console.error(err)
        if (!resp.headersSent) {
            resp.status(500).type('text/plain').send('Unable to read file.')
        }
        else {
            resp.destroy()
        }
    })
    resp.on('close', () => {
        file.destroy()
    })
})

// Listen on the loopback interfaces only. The CLI opens the browser at
// http://localhost:<port>, which may resolve to either address family, so
// both are bound when available; other hosts on the network get nothing.
function listenLoopback(host) {
    return new Promise((resolve) => {
        const server = http.createServer(app)
        server.once('error', (err) => {
            console.warn(`Not listening on ${host}: ${err.code}`)
            resolve(undefined)
        })
        server.listen(port, host, () => resolve(server))
    })
}

Promise.all([listenLoopback('127.0.0.1'), listenLoopback('::1')]).then((servers) => {
    if (!servers.some((s) => s)) {
        console.error(`Unable to listen on port ${port}.`)
        process.exit(1)
    }
    console.info(`Serving files in ${dir} on port ${port} (localhost only).`)
})
