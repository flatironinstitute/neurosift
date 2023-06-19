import { useTimeRange } from '../context-timeseries-selection';
import { useMemo } from 'react';
import { TimeWidgetToolbarEntries } from '../component-time-scroll-view';
import { Divider, ToolbarItem } from '../ViewToolbar';

export type OptionalToolbarActions = {
    aboveDefault?: ToolbarItem[]
    belowDefault?: ToolbarItem[]
}

const useActionToolbar = (props?: OptionalToolbarActions) => {
    const { aboveDefault, belowDefault } = props || {}
    const { zoomTimeseriesSelection, panTimeseriesSelection } = useTimeRange()

    const timeControlActions = useMemo(() => {
        if (!zoomTimeseriesSelection || !panTimeseriesSelection) return []
        const preToolbarEntries = aboveDefault ? [...aboveDefault, Divider] : []
        const postToolbarEntries = belowDefault ? [Divider, ...belowDefault] : []
        const timeControls = TimeWidgetToolbarEntries({zoomTimeseriesSelection, panTimeseriesSelection})
        const actions: ToolbarItem[] = [
            ...preToolbarEntries,
            ...timeControls,
            ...postToolbarEntries
        ]
        return actions
    }, [zoomTimeseriesSelection, panTimeseriesSelection, aboveDefault, belowDefault])

    return timeControlActions
}

export default useActionToolbar