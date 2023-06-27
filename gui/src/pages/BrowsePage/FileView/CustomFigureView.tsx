import { FunctionComponent, useMemo } from "react";
import NSFigView from "./NSFigView/NSFigView";
import { NSFigLayout, NSFigViewData } from "./NSFigView/NSFigViewData";

type Props = {
    fileNames: string[]
    width: number
    height: number
}

const CustomFigureView: FunctionComponent<Props> = ({fileNames, width, height}) => {
    const viewData: NSFigViewData = useMemo(() => {
        const layout: NSFigLayout = {
            type: 'Box',
            direction: 'vertical',
            items: []
        }
        const ret: NSFigViewData = {
            type: 'neurosift_figure',
            version: 'v1',
            layout,
            views: []
        }
        const timeseriesAnnotationFile = fileNames.find(x => x.endsWith('.ns-tsa'))
        const videoAnnotationFile = fileNames.find(x => x.endsWith('.ns-van'))
        const positionDecodeFieldFile = fileNames.find(x => x.endsWith('.ns-pdf'))
        for (const fileName of fileNames) {
            if (fileName.endsWith('.ns-tsg')) {
                ret.views.push({
                    name: fileName,
                    type: 'TimeseriesGraph',
                    data: fileName,
                    annotation: timeseriesAnnotationFile
                })
                layout.items.push({
                    stretch: 1,
                    view: fileName
                })
            }
            else if (fileName.endsWith('.ns-asp')) {
                ret.views.push({
                    name: fileName,
                    type: 'AudioSpectrogram',
                    data: fileName,
                    annotation: timeseriesAnnotationFile
                })
                layout.items.push({
                    stretch: 1,
                    view: fileName
                })
            }
            else if (fileName.endsWith('.ns-spt')) {
                ret.views.push({
                    name: fileName,
                    type: 'RasterPlot',
                    data: fileName
                })
                layout.items.push({
                    stretch: 1,
                    view: fileName
                })
            }
            else if ((fileName.endsWith('.avi')) || (fileName.endsWith('.mp4'))) {
                ret.views.push({
                    name: fileName,
                    type: 'AnnotatedVideo',
                    data: fileName,
                    annotation: videoAnnotationFile,
                    position_decode_field: positionDecodeFieldFile
                })
                layout.items.push({
                    stretch: 1,
                    view: fileName
                })
            }
            else if (fileName.endsWith('.ns-acg')) {
                ret.views.push({
                    name: fileName,
                    type: 'Autocorrelograms',
                    data: fileName
                })
                layout.items.push({
                    stretch: 1,
                    view: fileName
                })
            }
            else if (fileName.endsWith('.ns-awf')) {
                ret.views.push({
                    name: fileName,
                    type: 'AverageWaveforms',
                    data: fileName
                })
                layout.items.push({
                    stretch: 1,
                    view: fileName
                })
            }
        }
        return ret
    }, [fileNames])
    return (
        <NSFigView
            data={viewData}
            path=""
            width={width}
            height={height}
        />
    )
}

export default CustomFigureView