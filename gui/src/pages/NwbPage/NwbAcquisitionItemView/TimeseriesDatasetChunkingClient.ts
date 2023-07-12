import { Canceler } from "../RemoteH5File/helpers";
import { RemoteH5Dataset, RemoteH5File } from "../RemoteH5File/RemoteH5File";

class TimeseriesDatasetChunkingClient {
    #chunks: {[k: number]: number[][]} = {}
    constructor(private nwbFile: RemoteH5File, private dataset: RemoteH5Dataset, private chunkSize: number) {
    }
    async getConcatenatedChunk(startChunkIndex: number, endChunkIndex: number, canceler: Canceler): Promise<{concatenatedChunk: number[][], completed: boolean}> {
        const timer = Date.now()
        const chunks: (number[][])[] = []
        let completed = true
        for (let ii = startChunkIndex; ii < endChunkIndex; ii ++) {
            if (!this.#chunks[ii]) {
                // there's a problem -- what if the chunk load gets canceled elsewhere. Not sure what to do.
                await this._loadChunk(ii, canceler)
            }
            chunks.push(this.#chunks[ii])
            const elapsedSec = (Date.now() - timer) / 1000
            if (elapsedSec > 2) {
                completed = false
                break
            }
        }
        const n1 = sum(chunks.map(ch => ((ch[0] || []).length)))
        const concatenatedChunk: number[][] = []
        const N1 = this.dataset.shape[1] || 1
        for (let i = 0; i < N1; i ++) {
            const x: number[] = []
            for (let j = 0; j < n1; j ++) {
                x.push(NaN)
            }
            concatenatedChunk.push(x)
        }
        let i1 = 0
        for (let ii = startChunkIndex; ii < endChunkIndex; ii ++) {
            const chunk = this.#chunks[ii]
            if (chunk) {
                for (let i = 0; i < chunk.length; i ++) {
                    for (let j = 0; j < chunk[i].length; j ++) {
                        concatenatedChunk[i][i1 + j] = chunk[i][j]
                    }
                }
                i1 += (chunk[0] || []).length
            }
        }
        return {concatenatedChunk, completed}
    }
    private async _loadChunk(chunkIndex: number, canceler: Canceler) {
        const shape = this.dataset.shape
        const i1 = chunkIndex * this.chunkSize
        const i2 = Math.min(i1 + this.chunkSize, shape[0])
        const N1 = Math.min(shape[1] || 1, 5) // for now limit to 5 columns (until we can figure out why reading is so slow)
        if (shape.length > 2) throw Error('TimeseriesDatasetChunkingClient not implemented implemented for shape.length > 2')
        const slice: [number, number][] = shape.length === 1 ? [[i1, i2]] : [[i1, i2], [0, N1]]
        const data = await this.nwbFile.getDatasetData(this.dataset.path, {slice, canceler})
        const chunk: number[][] = []
        for (let i = 0; i < N1; i ++) {
            const x: number[] = []
            for (let j = 0; j < i2 - i1; j ++) {
                x.push(data[i + j * N1])
            }
            chunk.push(x)
        }
        this.#chunks[chunkIndex] = chunk
    }
}

const sum = (x: number[]) => {
    let s = 0
    for (let i = 0; i < x.length; i ++) {
        s += x[i]
    }
    return s
}

export default TimeseriesDatasetChunkingClient