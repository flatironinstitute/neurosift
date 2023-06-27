import { FunctionComponent, PropsWithChildren, ReactElement, useMemo } from "react"

type Props = {
    width: number
    height: number
    singleRow?: boolean
}

const BoxGrid: FunctionComponent<PropsWithChildren<Props>> = ({width, height, children, singleRow}) => {
    const ch = children as ReactElement[]
    const boxPositions = useMemo(() => {
        const ret: {x: number, y: number, w: number, h: number}[] = []
        const numBoxes = ch.length
        const targetWidthToHeightRatio = 1 / 3
        const widthToHeightRatio = width / (height || 1)
        const numCols = singleRow ? numBoxes : Math.ceil(Math.sqrt(numBoxes * widthToHeightRatio / targetWidthToHeightRatio))
        const numRows = Math.ceil(numBoxes / numCols)
        const boxWidth = width / numCols
        const boxHeight = height / numRows
        for (let i = 0; i < numBoxes; i++) {
            const col = i % numCols
            const row = Math.floor(i / numCols)
            const x = col * boxWidth
            const y = row * boxHeight
            ret.push({x, y, w: boxWidth, h: boxHeight})
        }
        return ret
    }, [ch.length, width, height, singleRow])

    return (
        <div style={{position: 'absolute', width, height}}>
            {
                ch.map((child, ii) => {
                    const pos = boxPositions[ii]
                    return (
                        <div
                            key={ii}
                            style={{
                                position: 'absolute',
                                left: pos.x,
                                top: pos.y,
                                width: pos.w,
                                height: pos.h
                            }}
                        >
                            <child.type {...child.props} width={pos.w} height={pos.h} />
                        </div>
                    )
                })
            }
        </div>
    )
}

export default BoxGrid