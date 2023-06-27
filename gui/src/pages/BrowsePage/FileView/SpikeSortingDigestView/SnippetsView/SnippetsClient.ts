import ZarrArrayClient from "../../../../zarr/ZarrArrayClient"

export type Snippet = {
    waveform: number[][] // nSamples x nChannels
}

const numSnippetsPerChunk = 100

class SnippetsClient {
    #chunks: {[index: number]: Snippet[]} = {}
    #chunksLoading: {[index: number]: boolean} = {}
    constructor(private arrayClient: ZarrArrayClient) {
    }
    async getSnippets(start: number, end: number) {
        const shape = await this.arrayClient.shape()
        if (end > shape[0]) end = shape[0]

        // First let's load the chunks
        const startChunk = Math.floor(start / numSnippetsPerChunk)
        const endChunk = Math.floor((end - 1) / numSnippetsPerChunk)
        for (let chunkIndex = startChunk; chunkIndex <= endChunk; chunkIndex++) {
            await this._loadChunk(chunkIndex)
        }

        // Now let's get the snippets
        const ret: Snippet[] = []
        for (let i = start; i < end; i++) {
            const chunkIndex = Math.floor(i / numSnippetsPerChunk)
            const chunk = this.#chunks[chunkIndex]
            const ii = i - chunkIndex * numSnippetsPerChunk
            ret.push(chunk[ii])
        }

        return ret
    }
    async _loadChunk(chunkIndex: number) {
        if (this.#chunks[chunkIndex]) return
        while (this.#chunksLoading[chunkIndex]) {
            // if the chunk is already loading, wait for it to finish
            await new Promise(resolve => {
                setTimeout(() => {
                    resolve(null)
                }, 10)
            })
        }
        if (this.#chunks[chunkIndex]) return
        console.log(`Loading chunk ${chunkIndex}`)
        this.#chunksLoading[chunkIndex] = true
        const start = chunkIndex * numSnippetsPerChunk
        let end = (chunkIndex + 1) * numSnippetsPerChunk
        const shape = await this.arrayClient.shape()
        if (end > shape[0]) end = shape[0]
        const slices = [{start, stop: end, step: 1}, {start: 0, stop: shape[1], step: 1}, {start: 0, stop: shape[2], step: 1}]
        const array = await this.arrayClient.getSubArray(slices)
        this.#chunks[chunkIndex] = array.map(waveform => ({
            waveform: waveform as number[][]
        }))
        this.#chunksLoading[chunkIndex] = false
    }
}

export default SnippetsClient