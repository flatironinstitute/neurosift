const express = require('express')
const app = express()
const port = process.env.PORT || 61762
const dir = process.argv[2]
if (!dir) {
    console.error('Please specify a directory.')
    process.exit(-1)
}
console.info('Serving files in', dir)

// Allow CORS from neurosift.app flatironinstitute.github.io and localhost:3000
const allowedOrigins = ['https://neurosift.app', 'https://flatironinstitute.github.io', 'http://localhost:3000', 'http://localhost:4200']
app.use((req, resp, next) => {
    const origin = req.get('origin')
    const allowedOrigin = allowedOrigins.includes(origin) ? origin : undefined
    if (allowedOrigin) {
        resp.header('Access-Control-Allow-Origin', allowedOrigin)
        resp.header('Access-Control-Allow-Headers', "Origin, X-Requested-With, Content-Type, Accept, Range")
    }
    next()
})

app.options('*', (req, resp) => {
    resp.sendStatus(200)
})

// Serve files
app.get('/files/:fileName(*)', async (req, resp) => {
    const fileName = req.params.fileName
    // Check if the file is shareable
    if (!isShareable(fileName)) {
        console.warn('Access to this file is forbidden.', fileName)
        resp.send(500).send('Access to this file is forbidden.')
        return
    }

    // Send the file
    const options = {
        root: dir,
        // let's allow dot files for now
        dotfiles: 'allow'
    }
    resp.sendFile(fileName, options, function (err) {
        // I think it's important to have an error handler even if it's just this. (not sure though)
        if (err) {
            console.warn('Error sending file:', err)
        }
    })
})

app.options('/files/:fileName(*)', async (req, resp) => {
    resp.send(200)
})

function isShareable(f) {
    const bb = f.split('/')
    if (bb.includes('..')) {
        // don't allow access to parent directories
        return false
    }
    const fileName = bb[bb.length - 1]
    if (fileName.startsWith('.')) {
        if (!['.zattrs', '.zgroup', '.zarray', '.zmetadata'].includes(fileName)) {
            // don't show hidden files (with some exceptions)
            return false
        }
    }
    return true
}

app.listen(port, () => {
    console.info(`Serving files in ${dir} on port ${port}.`)
});