/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { FunctionComponent, useEffect, useState } from "react"
import { MergedRemoteH5File, RemoteH5Dataset, RemoteH5File, RemoteH5Group } from "../../RemoteH5File/RemoteH5File"

type Props = {
    width: number
    height: number
    imageSegmentationGroup: RemoteH5Group
    nwbFile: RemoteH5File | MergedRemoteH5File
    selectedSegmentationName: string
}

// important to store localized masks, otherwise we run out of RAM quick
type UnitMask = {
    x0: number
    y0: number
    w0: number
    h0: number
    data: number[][]
}

const blockSize = 50
class PlaneSegmentationClient {
    #imageMaskDataset: RemoteH5Dataset | undefined
    #blocks: {[i: number]: UnitMask[]} = {}
    constructor(private nwbFile: RemoteH5File | MergedRemoteH5File, private objectPath: string) {
    }
    async initialize() {
        this.#imageMaskDataset = await this.nwbFile.getDataset(`${this.objectPath}/image_mask`)
    }
    get shape() {
        return this.#imageMaskDataset!.shape
    }
    async getImageMask(index: number) {
        const block = await this._loadBlock(Math.floor(index / blockSize))
        return block[index % blockSize]
    }
    private async _loadBlock(chunkIndex: number) {
        if (this.#blocks[chunkIndex]) return this.#blocks[chunkIndex]
        const i1 = chunkIndex * blockSize
        const i2 = Math.min(this.shape[0], i1 + blockSize)
        const data = await this.nwbFile.getDatasetData(`${this.objectPath}/image_mask`, {slice: [[i1, i2], [0, this.shape[1]], [0, this.shape[2]]]})
        if (!data) throw Error(`Unable to load image mask data`)
        const block: (UnitMask)[] = []
        for (let i = 0; i < i2 - i1; i++) {
            const plane: number[][] = []
            for (let j = 0; j < this.shape[1]; j++) {
                const row: number[] = []
                for (let k = 0; k < this.shape[2]; k++) {
                    row.push(data[i * this.shape[1] * this.shape[2] + j * this.shape[2] + k])
                }
                plane.push(row)
            }
            // important to store localized masks, otherwise we run out of RAM quick
            const {x0, y0, w0, h0} = getBoundingRect(plane)
            const data0: number[][] = []
            for (let j = 0; j < w0; j++) {
                const row: number[] = []
                for (let k = 0; k < h0; k++) {
                    row.push(plane[x0 + j][y0 + k])
                }
                data0.push(row)
            }
            block.push({
                x0,
                y0,
                w0,
                h0,
                data: data0
            })
        }
        
        this.#blocks[chunkIndex] = block
        return block
    }
}

const PlaneSegmentationView: FunctionComponent<Props> = ({width, height, imageSegmentationGroup, nwbFile, selectedSegmentationName}) => {
    const [client, setClient] = useState<PlaneSegmentationClient | undefined>(undefined)
    useEffect(() => {
        let canceled = false
        const load = async () => {
            const c = new PlaneSegmentationClient(nwbFile, `${imageSegmentationGroup.path}/${selectedSegmentationName}`)
            await c.initialize()
            if (canceled) return
            setClient(c)
        }
        load()
        return () => {canceled = true}
    }, [nwbFile, selectedSegmentationName, imageSegmentationGroup.path])
    if (!client) return <div>Loading client...</div>
    return (
        <Test1
            width={width}
            height={height}
            client={client}
        />
    )
}

const v1 = 255
const v2 = 160
const _ = 128
const distinctColors = [
    [v1, _, _],
    [_, v1, _],
    [_, _, v1],
    [v1, v1, _],
    [v1, _, v1],
    [_, v1, v1],
    [v1, v2, _],
    [v1, _, v2],
    [_, v1, v2],
    [v2, v1, _],
    [v2, _, v1],
    [_, v2, v1]
]

const Test1: FunctionComponent<{client: PlaneSegmentationClient, width: number, height: number}> = ({client, width, height}) => {
    const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | undefined>(undefined)

    const statusBarHeight = 15

    const N0 = client.shape[0]
    const N1 = client.shape[1]
    const N2 = client.shape[2]
    const scale = Math.min(width / N1, (height - statusBarHeight) / N2)
    const offsetX = (width - N1 * scale) / 2
    const offsetY = ((height - statusBarHeight) - N2 * scale) / 2

    const [loadingMessage, setLoadingMessage] = useState('')

    useEffect(() => {
        setLoadingMessage('Loading...')
        let canceled = false
        if (!canvasElement) return
        const ctx = canvasElement.getContext('2d')
        if (!ctx) return
        ctx.fillStyle = 'black'
        ctx.fillRect(0, 0, canvasElement.width, canvasElement.height)
        const load = async () => {
            let timer = Date.now()
            for (let j = 0; j < N0; j++) {
                const elapsed = (Date.now() - timer) / 1000
                if (elapsed > 1) {
                    setLoadingMessage(`Loaded ${j} / ${N0}...`)
                    timer = Date.now()
                }
                const color = distinctColors[j % distinctColors.length]
                const aa = await client.getImageMask(j)
                if (canceled) return
                const {x0, y0, w0, h0, data} = aa
                const maxval = computeMaxVal(data)
                const imageData = ctx.createImageData(w0, h0)
                for (let i = 0; i < w0; i++) {
                    for (let j = 0; j < h0; j++) {
                        const v = data[i][j] / (maxval || 1)
                        const index = (j * w0 + i) * 4
                        imageData.data[index + 0] = color[0] * v
                        imageData.data[index + 1] = color[1] * v
                        imageData.data[index + 2] = color[2] * v
                        imageData.data[index + 3] = v ? (v * 255) : 0
                    }
                }
                const offscreenCanvas = document.createElement('canvas')
                offscreenCanvas.width = w0
                offscreenCanvas.height = h0
                const c = offscreenCanvas.getContext('2d')
                if (!c) return
                c.putImageData(imageData, 0, 0)
                ctx.drawImage(offscreenCanvas, x0 * scale, y0 * scale, w0 * scale, h0 * scale)
            }
            setLoadingMessage(`Loaded ${N0} units`)
        }
        load()
        return () => {canceled = true}
    }, [canvasElement, client, N0, N1, N2, scale])

    return (
        <div style={{position: 'absolute', width, height, fontSize: 12}}>
            <div style={{position: 'absolute', width: N1 * scale, height: N2 * scale, left: offsetX, top: offsetY}}>
                <canvas
                    ref={elmt => elmt && setCanvasElement(elmt)}
                    width={N1 * scale}
                    height={N2 * scale}
                />
            </div>
            <div style={{position: 'absolute', width, height: statusBarHeight, top: height - statusBarHeight}}>
                {loadingMessage}
            </div>
        </div>
    )
}

const getBoundingRect = (data: number[][]) => {
    let x0 = undefined
    let y0 = undefined
    let x1 = undefined
    let y1 = undefined
    for (let i = 0; i < data.length; i++) {
        const row = data[i]
        for (let j = 0; j < row.length; j++) {
            const v = row[j]
            if (v) {
                if (x0 === undefined) x0 = i
                if (y0 === undefined) y0 = j
                if (x1 === undefined) x1 = i
                if (y1 === undefined) y1 = j
                x0 = Math.min(x0, i)
                y0 = Math.min(y0, j)
                x1 = Math.max(x1, i)
                y1 = Math.max(y1, j)
            }
        }
    }
    if ((x0 === undefined) || (y0 === undefined) || (x1 === undefined) || (y1 === undefined)) return {x0: 0, y0: 0, w0: 0, h0: 0}
    return {x0, y0, w0: x1 - x0 + 1, h0: y1 - y0 + 1}
}

const computeMaxVal = (data: number[][]) => {
    let maxval = 0
    for (let i = 0; i < data.length; i++) {
        const row = data[i]
        for (let j = 0; j < row.length; j++) {
            const v = row[j]
            maxval = Math.max(maxval, v)
        }
    }
    return maxval
}

export default PlaneSegmentationView