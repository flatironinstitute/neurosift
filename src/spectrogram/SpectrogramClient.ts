import RtcshareFileSystemClient from "../rtcshare/RtcshareDataManager/RtcshareFileSystemClient"

const chunkSize = 10000

class SpectrogramClient {
    #onDataRecievedCallbacks: (() => void)[] = []
    #chunks: {[dsFactor: number]: {[chunkIndex: number]: Uint8Array}} = {}
    #fetchingChunks = new Set<string>()
    #spectrogramInfo: {
        durationSec: number
        numSamples: number
        samplingFrequency: number
        numFrequencies: number
    } | undefined = undefined
    #initializing = false
    constructor(private uri: string, private rtcshareClient: RtcshareFileSystemClient) {

    }
    async initialize() {
        if (this.#spectrogramInfo) return
        if (this.#initializing) {
            await new Promise(resolve => {
                const interval = setInterval(() => {
                    if (!this.#initializing) {
                        clearInterval(interval)
                        resolve(undefined)
                    }
                }, 100)
            })
            return
        }
        this.#initializing = true
        try {
            const buf = await this.rtcshareClient.readFile(this.uri.slice('rtcshare://'.length) + '/.zattrs')
            // array buffer to json
            const info = JSON.parse(new TextDecoder().decode(buf))
            this.#spectrogramInfo = {
                durationSec: info.spectrogram_duration_sec,
                numSamples: info.spectrogram_num_samples,
                samplingFrequency: info.spectrogram_sr_hz,
                numFrequencies: info.spectrogram_num_frequencies
            }
        }
        finally {
            this.#initializing = false
        }
    }
    onDataRecieved(cb: () => void) {
        this.#onDataRecievedCallbacks.push(cb)
    }
    public get numTimepoints() {
        if (!this.#spectrogramInfo) throw Error(`Spectrogram info not initialized`)
        return Math.ceil(this.#spectrogramInfo.durationSec * this.#spectrogramInfo.samplingFrequency)
    }
    public get samplingFrequency() {
        if (!this.#spectrogramInfo) throw Error(`Spectrogram info not initialized`)
        return this.#spectrogramInfo.samplingFrequency
    }
    public get numFrequencies() {
        if (!this.#spectrogramInfo) throw Error(`Spectrogram info not initialized`)
        return this.#spectrogramInfo.numFrequencies
    }
    getValue(dsFactor: number, t: number, f: number) {
        const chunkIndex = Math.floor(t / chunkSize)
        const chunk = (this.#chunks[dsFactor] || {})[chunkIndex]
        if (!chunk) {
            this._fetchChunk(dsFactor, chunkIndex) // initiate fetching of the chunk
            return NaN
        }
        if (!this.#spectrogramInfo) throw Error(`Unexpected: spectrogram info not initialized`)
        const numFrequencies = this.#spectrogramInfo.numFrequencies
        const i = Math.floor(t) % chunkSize
        return chunk[i * numFrequencies + f]
    }
    async _fetchChunk(dsFactor: number, i: number) {
        await this.initialize()
        if (!this.#spectrogramInfo) throw Error(`Unexpected: spectrogram info not initialized`)
        const code = `${dsFactor}-${i}`
        if (this.#fetchingChunks.has(code)) return
        this.#fetchingChunks.add(code)
        const {result, binaryPayload} = await this.rtcshareClient.serviceQuery(
            'zarr',
            {
                type: 'get_array_chunk',
                path: this.uri,
                name: dsFactor === 1 ? '/spectrogram' : `/spectrogram_ds${dsFactor}`,
                slices: [
                    {
                        start: i * chunkSize,
                        stop: (i + 1) * chunkSize,
                        step: 1
                    },
                    {
                        start: 0,
                        stop: this.#spectrogramInfo.numFrequencies,
                        step: 1
                    }
                ]
            }
        )
        this.#fetchingChunks.delete(code)
        if (result.dtype !== 'uint8') {
            throw Error(`Unexpected data type for spectrogram zarr array: ${result.dataType}`)
        }
        if (!binaryPayload) {
            throw Error(`Unexpected: no binary payload`)
        }
        if (!this.#chunks[dsFactor]) this.#chunks[dsFactor] = {}
        this.#chunks[dsFactor][i] = new Uint8Array(binaryPayload)
        this.#onDataRecievedCallbacks.forEach(cb => {cb()})
    }
}

export default SpectrogramClient