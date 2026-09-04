// Starts the file server on a temporary directory and exercises it over HTTP.
// Run with: npm test
const assert = require('node:assert/strict')
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const http = require('node:http')
const net = require('node:net')
const os = require('node:os')
const path = require('node:path')
const { after, before, describe, it } = require('node:test')

const freePort = () =>
    new Promise((resolve, reject) => {
        const s = net.createServer()
        s.listen(0, '127.0.0.1', () => {
            const { port } = s.address()
            s.close(() => resolve(port))
        })
        s.on('error', reject)
    })

// Raw request so that paths like /files/../x reach the server unnormalized.
const request = (port, rawPath, { method = 'GET', headers = {} } = {}) =>
    new Promise((resolve, reject) => {
        const req = http.request(
            { host: '127.0.0.1', port, path: rawPath, method, headers },
            (res) => {
                const chunks = []
                res.on('data', (c) => chunks.push(c))
                res.on('end', () =>
                    resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }),
                )
            },
        )
        req.on('error', reject)
        req.end()
    })

const waitForServer = async (port, child) => {
    for (let i = 0; i < 100; i++) {
        if (child.exitCode !== null) throw new Error(`server exited with ${child.exitCode}`)
        try {
            await request(port, '/files/does-not-matter')
            return
        }
        catch {
            await new Promise((r) => setTimeout(r, 50))
        }
    }
    throw new Error('server did not start')
}

describe('local file server', () => {
    let tmp
    let port
    let child
    let stderr = ''
    const content = Buffer.alloc(1000)
    for (let i = 0; i < content.length; i++) content[i] = i % 251

    before(async () => {
        tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'neurosift-server-'))
        fs.writeFileSync(path.join(tmp, 'a.bin'), content)
        fs.writeFileSync(path.join(tmp, '.zattrs'), '{}')
        fs.writeFileSync(path.join(tmp, '.hidden'), 'secret')
        fs.mkdirSync(path.join(tmp, 'sub'))
        fs.writeFileSync(path.join(tmp, 'sub', 'b.bin'), 'bbb')
        // Something outside the served directory that must stay unreachable.
        fs.writeFileSync(path.join(path.dirname(tmp), path.basename(tmp) + '-outside.txt'), 'outside')
        port = await freePort()
        child = spawn(process.execPath, [path.join(__dirname, '..', 'src', 'index.js'), tmp], {
            env: { ...process.env, PORT: String(port) },
            stdio: ['ignore', 'ignore', 'pipe'],
        })
        child.stderr.on('data', (d) => { stderr += d.toString() })
        await waitForServer(port, child)
    })

    after(() => {
        if (child && child.exitCode === null) child.kill()
        fs.rmSync(tmp, { recursive: true, force: true })
        fs.rmSync(path.join(path.dirname(tmp), path.basename(tmp) + '-outside.txt'), { force: true })
    })

    const assertAlive = async () => {
        assert.equal(child.exitCode, null, `server exited\n${stderr}`)
        const r = await request(port, '/files/a.bin', { headers: { range: 'bytes=0-0' } })
        assert.equal(r.status, 206)
    }

    it('serves a whole file', async () => {
        const r = await request(port, '/files/a.bin')
        assert.equal(r.status, 200)
        assert.equal(r.headers['content-length'], '1000')
        assert.equal(r.headers['accept-ranges'], 'bytes')
        assert.ok(r.body.equals(content))
    })

    it('serves a file in a subdirectory', async () => {
        const r = await request(port, '/files/sub/b.bin')
        assert.equal(r.status, 200)
        assert.equal(r.body.toString(), 'bbb')
    })

    it('serves a closed byte range', async () => {
        const r = await request(port, '/files/a.bin', { headers: { range: 'bytes=10-19' } })
        assert.equal(r.status, 206)
        assert.equal(r.headers['content-range'], 'bytes 10-19/1000')
        assert.equal(r.headers['content-length'], '10')
        assert.ok(r.body.equals(content.subarray(10, 20)))
    })

    it('serves an open-ended byte range', async () => {
        const r = await request(port, '/files/a.bin', { headers: { range: 'bytes=990-' } })
        assert.equal(r.status, 206)
        assert.equal(r.headers['content-range'], 'bytes 990-999/1000')
        assert.ok(r.body.equals(content.subarray(990)))
    })

    it('serves a suffix byte range', async () => {
        const r = await request(port, '/files/a.bin', { headers: { range: 'bytes=-10' } })
        assert.equal(r.status, 206)
        assert.equal(r.headers['content-range'], 'bytes 990-999/1000')
        assert.ok(r.body.equals(content.subarray(990)))
    })

    it('clamps a range that runs past the end of the file', async () => {
        const r = await request(port, '/files/a.bin', { headers: { range: 'bytes=0-5000' } })
        assert.equal(r.status, 206)
        assert.equal(r.headers['content-range'], 'bytes 0-999/1000')
        assert.equal(r.headers['content-length'], '1000')
        assert.equal(r.body.length, 1000)
    })

    it('answers 416 for a range beyond the file', async () => {
        const r = await request(port, '/files/a.bin', { headers: { range: 'bytes=2000-3000' } })
        assert.equal(r.status, 416)
        assert.equal(r.headers['content-range'], 'bytes */1000')
        await assertAlive()
    })

    it('answers 416 for an inverted range', async () => {
        const r = await request(port, '/files/a.bin', { headers: { range: 'bytes=50-10' } })
        assert.equal(r.status, 416)
    })

    it('ignores a malformed Range header and sends the whole file', async () => {
        const r = await request(port, '/files/a.bin', { headers: { range: 'bytes=abc' } })
        assert.equal(r.status, 200)
        assert.equal(r.body.length, 1000)
    })

    it('answers HEAD with headers and no body', async () => {
        const r = await request(port, '/files/a.bin', { method: 'HEAD' })
        assert.equal(r.status, 200)
        assert.equal(r.headers['content-length'], '1000')
        assert.equal(r.body.length, 0)
        const r2 = await request(port, '/files/a.bin', { method: 'HEAD', headers: { range: 'bytes=0-9' } })
        assert.equal(r2.status, 206)
        assert.equal(r2.headers['content-range'], 'bytes 0-9/1000')
        assert.equal(r2.body.length, 0)
    })

    it('refuses parent directory traversal and keeps running', async () => {
        const outside = path.basename(tmp) + '-outside.txt'
        const r = await request(port, `/files/../${outside}`)
        assert.equal(r.status, 403)
        assert.ok(!r.body.toString().includes('outside'))
        const r2 = await request(port, `/files/sub/../../${outside}`)
        assert.equal(r2.status, 403)
        const r3 = await request(port, `/files/%2e%2e/${outside}`)
        assert.equal(r3.status, 403)
        await assertAlive()
    })

    it('refuses backslash traversal', async () => {
        const outside = path.basename(tmp) + '-outside.txt'
        const r = await request(port, `/files/sub%5C..%5C..%5C${outside}`)
        // 403 where backslash is a separator (Windows); 404 elsewhere, where
        // it is an ordinary character in a file name that does not exist.
        assert.ok([403, 404].includes(r.status), String(r.status))
        assert.ok(!r.body.toString().includes('outside'))
        await assertAlive()
    })

    it('hides dot files except the zarr metadata files', async () => {
        const r = await request(port, '/files/.hidden')
        assert.equal(r.status, 403)
        const r2 = await request(port, '/files/.zattrs')
        assert.equal(r2.status, 200)
        assert.equal(r2.body.toString(), '{}')
    })

    it('answers 404 for a missing file', async () => {
        const r = await request(port, '/files/missing.bin')
        assert.equal(r.status, 404)
        const r2 = await request(port, '/files/a.bin/child')
        assert.equal(r2.status, 404)
    })

    it('answers 404 for a directory and keeps running', async () => {
        const r = await request(port, '/files/sub')
        assert.equal(r.status, 404)
        await assertAlive()
    })

    it('allows only known origins', async () => {
        const ok = await request(port, '/files/a.bin', { method: 'HEAD', headers: { origin: 'https://neurosift.app' } })
        assert.equal(ok.headers['access-control-allow-origin'], 'https://neurosift.app')
        const dev = await request(port, '/files/a.bin', { method: 'HEAD', headers: { origin: 'http://localhost:5173' } })
        assert.equal(dev.headers['access-control-allow-origin'], 'http://localhost:5173')
        const preview = await request(port, '/files/a.bin', { method: 'HEAD', headers: { origin: 'https://my-branch.neurosift.pages.dev' } })
        assert.equal(preview.headers['access-control-allow-origin'], 'https://my-branch.neurosift.pages.dev')
        const bad = await request(port, '/files/a.bin', { method: 'HEAD', headers: { origin: 'https://evil.example' } })
        assert.equal(bad.headers['access-control-allow-origin'], undefined)
    })

    it('listens on loopback only', async () => {
        const addresses = Object.values(os.networkInterfaces())
            .flat()
            .filter((a) => a && !a.internal && a.family === 'IPv4')
            .map((a) => a.address)
        for (const address of addresses) {
            await assert.rejects(
                new Promise((resolve, reject) => {
                    const s = net.connect({ host: address, port, timeout: 1000 })
                    s.on('connect', () => { s.destroy(); resolve() })
                    s.on('timeout', () => { s.destroy(); reject(new Error('timeout')) })
                    s.on('error', reject)
                }),
                undefined,
                `connected via ${address}`,
            )
        }
    })
})
