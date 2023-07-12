/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ArrowLeft, ArrowRight } from "@mui/icons-material"
import { FunctionComponent, useContext, useEffect, useMemo, useState } from "react"
import SmallIconButton from "../../../components/SmallIconButton"
import Splitter from "../../../components/Splitter"
import { useTimeRange, useTimeseriesSelection, useTimeseriesSelectionInitialization } from "../../../package/context-timeseries-selection"
import NeurodataItemViewLeftPanel from "../NeurodataItemView/NeurodataItemViewLeftPanel"
import { useNwbTimeseriesDataClient } from "../NwbAcquisitionItemView/NwbTimeseriesDataClient"
import TimeseriesSelectionBar, { timeSelectionBarHeight } from "../NwbAcquisitionItemView/TimeseriesSelectionBar"
import { NwbFileContext } from "../NwbFileContext"
import { useDataset, useGroup } from "../NwbMainView/NwbMainView"
import { Canceler } from "../RemoteH5File/helpers"
import { DatasetDataType } from "../RemoteH5File/RemoteH5File"

type Props = {
    width: number
    height: number
    path: string
    condensed?: boolean
}

type ImageData = {
    width: number
    height: number
    data: DatasetDataType
}

const TwoPhotonSeriesItemView: FunctionComponent<Props> = ({width, height, path, condensed}) => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is null')
    const group = useGroup(nwbFile, path)

    const content = (
        <TwoPhotonSeriesItemViewChild
            width={width}
            height={height}
            path={path}
            condensed={condensed}
        />
    )
    if (condensed) return content

    return (
        <Splitter
            direction="horizontal"
            initialPosition={300}
            width={width}
            height={height}
        >
            <NeurodataItemViewLeftPanel
                width={0}
                height={0}
                path={path}
                group={group}
                viewName="TwoPhotonSeries"
            />
            {content}
        </Splitter>
    )
}

const TwoPhotonSeriesItemViewChild: FunctionComponent<Props> = ({width, height, path}) => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is null')
    const dataDataset = useDataset(nwbFile, path + '/data')

    const [currentImage, setCurrentImage] = useState<ImageData | undefined>(undefined)
    const timeseriesDataClient = useNwbTimeseriesDataClient(nwbFile, path)

    const {currentTime, setCurrentTime} = useTimeseriesSelection()
    const {setVisibleTimeRange} = useTimeRange()
    useTimeseriesSelectionInitialization(timeseriesDataClient?.startTime, timeseriesDataClient?.endTime)
    useEffect(() => {
        if (!timeseriesDataClient) return
        setCurrentTime(timeseriesDataClient.startTime!)
    }, [timeseriesDataClient, setCurrentTime, setVisibleTimeRange])

    const [currentPlane, setCurrentPlane] = useState<number>(0)
    const [currentBrightness, setCurrentBrightness] = useState<number>(50)
    const [currentContrast, setCurrentContrast] = useState<number>(50)

    useEffect(() => {
        setCurrentPlane(Math.floor((dataDataset?.shape[3] || 1) / 2))
    }, [dataDataset])

    const [loading, setLoading] = useState(false)

    const [frameIndex, setFrameIndex] = useState<number | undefined>(undefined)
    useEffect(() => {
        if (currentTime === undefined) return undefined
        if (!timeseriesDataClient) return undefined
        let canceled = false
        ;(async () => {
            const i1 = await timeseriesDataClient?.getDataIndexForTime(currentTime)
            if (canceled) return
            setFrameIndex(i1)
        })()
        return () => {canceled = true}
    }, [currentTime, timeseriesDataClient])

    useEffect(() => {
        if (!dataDataset) return
        if ((dataDataset.shape.length !== 3) && (dataDataset.shape.length !== 4)) {
            console.warn('Unsupported shape for data dataset: ' + dataDataset.shape.join(', '))
            return
        }
        // const N1 = dataDataset.shape[0]
        const N2 = dataDataset.shape[1]
        const N3 = dataDataset.shape[2]
        const canceler: Canceler = {onCancel: []}
        let canceled = false
        const load = async () => {
            if (frameIndex === undefined) return
            setLoading(true)
            const slice = [[frameIndex, frameIndex + 1], [0, N2], [0, N3]] as [number, number][]
            if (dataDataset.shape.length === 4) {
                slice.push([currentPlane, currentPlane + 1])
            }
            const x = await nwbFile.getDatasetData(dataDataset.path, {slice, canceler})
            if (canceled) return
            setCurrentImage({
                width: N3,
                height: N2,
                data: x
            })
            setLoading(false)
        }
        load()
        return () => {
            canceler.onCancel.forEach((f) => f())
            canceled = true
        }
    }, [dataDataset, nwbFile, frameIndex, timeseriesDataClient, currentPlane])

    const [maxValue, setMaxValue] = useState<number | undefined>(undefined)
    useEffect(() => {
        if (!currentImage) return
        const max = maximum(currentImage.data)
        setMaxValue(v => (Math.max(v || 0, max)))
    }, [currentImage])

    const bottomBarHeight = 40
    
    const incrementFrame = useMemo(() => ((inc: number) => {
        (async () => {
            if (!timeseriesDataClient) return
            if (frameIndex === undefined) return
            const i1 = frameIndex
            const i2 = i1 + inc
            const tt = await timeseriesDataClient.getTimestampsForDataIndices(i2, i2 + 1)
            setCurrentTime(tt[0])
        })()
    }), [timeseriesDataClient, frameIndex, setCurrentTime])

    return (
        <div style={{position: 'absolute', width, height}}>
            <div style={{position: 'absolute', width, height: timeSelectionBarHeight}}>
                <TimeseriesSelectionBar width={width} height={timeSelectionBarHeight - 5} hideVisibleTimeRange={true} />
            </div>
            <div style={{position: 'absolute', top: timeSelectionBarHeight, width, height: height - timeSelectionBarHeight - bottomBarHeight}}>
                {currentImage ? <ImageDataView
                    width={width}
                    height={height - timeSelectionBarHeight - bottomBarHeight}
                    imageData={currentImage}
                    maxValue={maxValue}
                    brightness={currentBrightness}
                    contrast={currentContrast}
                /> : <div>loading...</div>}
            </div>
            <div style={{position: 'absolute', top: height - bottomBarHeight, width, height: bottomBarHeight}}>
                <SmallIconButton disabled={(currentTime || 0) <= (timeseriesDataClient?.startTime || 0)} onClick={() => incrementFrame(-1)} icon={<ArrowLeft />} />
                <SmallIconButton disabled={(currentTime || 0) >= (timeseriesDataClient?.endTime || 0)} onClick={() => incrementFrame(1)} icon={<ArrowRight />} />
                &nbsp;&nbsp;
                <PlaneSelector currentPlane={currentPlane} setCurrentPlane={setCurrentPlane} numPlanes={dataDataset?.shape[3] || 1} />
                &nbsp;&nbsp;
                <BrightnessSelector currentBrightness={currentBrightness} setCurrentBrightness={setCurrentBrightness} />
                &nbsp;&nbsp;
                <ContrastSelector currentContrast={currentContrast} setCurrentContrast={setCurrentContrast} />
                {
                    loading && <span>&nbsp;&nbsp;(Loading...)</span>
                }
            </div>
        </div>
    )
}

type ImageDataViewProps = {
    width: number
    height: number
    imageData: ImageData
    maxValue?: number
    brightness: number
    contrast: number
}

const margins = {left: 10, right: 10, top: 10, bottom: 10}

const ImageDataView: FunctionComponent<ImageDataViewProps> = ({width, height, imageData, maxValue, brightness, contrast}) => {
    const {width: W, height: H, data} = imageData
    const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | undefined>(undefined)
    useEffect(() => {
        if (!canvasElement) return
        const ctx = canvasElement.getContext('2d')
        if (!ctx) return

        const transformValue = (v: number) => {
            const v2 = v / (maxValue || 1) * Math.exp((brightness - 50) / 50 * 1.5)
            const v3 = (v2 - 0.5) * Math.exp((contrast - 50) / 50 * 3) + 0.5
            return v3
        }

        const scale = Math.min((width - margins.left - margins.right) / (W), (height - margins.top - margins.bottom) / (H))
        const offsetX = margins.left + (width - margins.left - margins.right - (W) * scale) / 2
        const offsetY = margins.top + (height - margins.top - margins.bottom - (H) * scale) / 2

        const imgData = ctx.createImageData(W, H)
        const buf = imgData.data
        for (let i = 0; i < W * H; i++) {
            const v = Math.min(255, Math.round(transformValue(data[i]) * 255))
            buf[4 * i + 0] = v
            buf[4 * i + 1] = v
            buf[4 * i + 2] = v
            buf[4 * i + 3] = 255
        }
        const offscreenCanvas = document.createElement('canvas')
		offscreenCanvas.width = W
		offscreenCanvas.height = H
		const c = offscreenCanvas.getContext('2d')
		if (!c) return
		c.putImageData(imgData, 0, 0)

        ctx.clearRect(0, 0, width, height)
        ctx.drawImage(offscreenCanvas, offsetX, offsetY, W * scale, H * scale)
    }, [W, H, data, canvasElement, width, height, maxValue, brightness, contrast])
    return (
        <canvas
            ref={elmt => elmt && setCanvasElement(elmt)}
            width={width}
            height={height}
            style={{width, height}}
        />
    )
}

type PlaneSelectorProps = {
    currentPlane: number
    setCurrentPlane: (plane: number) => void
    numPlanes: number
}

const PlaneSelector: FunctionComponent<PlaneSelectorProps> = ({currentPlane, setCurrentPlane, numPlanes}) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentPlane(Number(e.target.value))
    }
    if (numPlanes <= 1) return (<span />)
    return (
        <RangeInput label="Plane" min={0} max={numPlanes - 1} value={currentPlane} showValue={true} onChange={handleChange} />
    )
}

type BrightnessSelectorProps = {
    currentBrightness: number
    setCurrentBrightness: (brightness: number) => void
}

const BrightnessSelector: FunctionComponent<BrightnessSelectorProps> = ({currentBrightness, setCurrentBrightness}) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentBrightness(Number(e.target.value))
    }
    if (currentBrightness === undefined) return (<span />)
    return (
        <RangeInput label="Brightness" min={0} max={100} value={currentBrightness} showValue={false} onChange={handleChange} />
    )
}

type ContrastSelectorProps = {
    currentContrast: number
    setCurrentContrast: (contrast: number) => void
}

const ContrastSelector: FunctionComponent<ContrastSelectorProps> = ({currentContrast, setCurrentContrast}) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentContrast(Number(e.target.value))
    }
    if (currentContrast === undefined) return (<span />)
    return (
        <RangeInput label="Contrast" min={0} max={100} value={currentContrast} showValue={false} onChange={handleChange} />
    )
}

const RangeInput: FunctionComponent<{label: string, min: number, max: number, value: number, showValue: boolean, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}> = ({label, min, max, value, showValue, onChange}) => {
    return (
        <span style={{fontSize: 12}}>
            {label}{showValue && ` ${value}`}: <input style={{width: 70, position: 'relative', top: 4}} type="range" min={min} max={max} value={value} onChange={onChange} />
        </span>
    )
}

const maximum = (x: DatasetDataType): number => {
    let max = -Infinity
    for (let i = 0; i < x.length; i++) {
        max = Math.max(max, x[i])
    }
    return max
}

export default TwoPhotonSeriesItemView