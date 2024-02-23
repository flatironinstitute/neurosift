import { defaultColors, PaintProps } from './electrodeGeometryPainting'

// NOTE: We may be able to COMPLETELY OMIT dataspace-pixelspace conversions if we use svg!
// (Need to look into this further)

type Props = PaintProps & {
    width: number,
    height: number
}

const verticalLayout = (props: Props) => {
    const { pixelElectrodes, pixelRadius, showLabels, xMargin, width } = props
    const colors = props.colors ?? defaultColors

    // One Em should equal the font size in pixels; labels will probably fit in two ems' space
    const labelOffset = showLabels ? 2 * pixelRadius : 0
    const xmin = xMargin + labelOffset
    const xmax = width - xMargin
    const paths = pixelElectrodes.map(e => `M ${xmin} ${e.pixelY} H ${xmax}`)
    const fullPath = paths.join(' ')
    const electrodeSvgs = [<path d={fullPath} stroke={colors.border}/>]
    const textRight = xmin - 0.5*pixelRadius
    const labels = showLabels
        ? pixelElectrodes.map(e => <text
                key={`electrodeLabel-${e.e.id}`}
                dominantBaseline={"middle"}
                textAnchor={"end"}
                fill={colors.textDark}
                x={textRight}
                y={e.pixelY}
            >{e.e.label}</text>)
        : []
    return {electrodeSvgs, labels}
}

const geomLayout = (props: Props) => {
    const { pixelElectrodes, selectedElectrodeIds, hoveredElectrodeId, draggedElectrodeIds, pixelRadius, offsetLabels, showLabels } = props
    const colors = props.colors ?? defaultColors
    const electrodesWithColors = pixelElectrodes.map(e => {
        const selected = selectedElectrodeIds.includes(e.e.id)
        const hovered = (hoveredElectrodeId ?? -1) === e.e.id
        const dragged = draggedElectrodeIds.includes(e.e.id)
        const color = selected 
            ? dragged
                ? colors.draggedSelected
                : hovered
                    ? colors.selectedHover
                    : colors.selected
            : dragged
                ? colors.dragged
                : hovered
                    ? colors.hover
                    : colors.base
        return {
            ...e,
            color: color,
            textColor: (selected || (hovered && !dragged)) ? colors.textDark : colors.textLight
        }
    })
    const electrodeSvgs = electrodesWithColors.map(e => {
        return (<circle
            key={`electrode-${e.e.id}`}
            cx={e.pixelX}
            cy={e.pixelY}
            r={pixelRadius}
            stroke={colors.border}
            strokeWidth={2}
            fill={e.color}
            className={`electrode-${e.e.id}`}
        />)
    })
    const labels = showLabels
        ? electrodesWithColors.map(e => {
            return (<text
                key={`electrodeLabel-${e.e.id}`}
                dominantBaseline={"middle"}
                textAnchor={offsetLabels ? "end" : "middle" }
                x={offsetLabels ? e.pixelX - 1.4*pixelRadius : e.pixelX}
                y={e.pixelY}
                fontSize={`${pixelRadius}px`}
                fill={offsetLabels ? colors.textDark : e.textColor}
            >{e.e.label}</text>)
        })
        : []
    return {electrodeSvgs, labels}
}

const SvgElectrodeLayout = (props: Props) => {
    const { width, height, pixelRadius, showLabels } = props
    const useLabels = pixelRadius > 5 && showLabels
    const colors = props.colors ?? defaultColors

    const {electrodeSvgs, labels} = props.layoutMode === 'geom'
        ? geomLayout({...props, colors: colors, showLabels: useLabels})
        : verticalLayout({...props, colors: colors})
    
    // TODO: USE VIEWBOX PROPERTY OF SVG TAG == INSTANTLY SCALED??
    return <svg xmlns="http://www.w3.org/2000/svg" style={{position: 'absolute', left: 0, top: 0, width: width, height: height}}>
        {electrodeSvgs}
        {useLabels && labels}
    </svg>
}

export default SvgElectrodeLayout