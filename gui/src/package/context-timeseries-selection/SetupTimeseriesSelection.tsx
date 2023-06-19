// import { useUrlState } from '@figurl/interface'
import React, { FunctionComponent, PropsWithChildren, useEffect, useMemo, useReducer, useRef } from 'react'
import TimeseriesSelectionContext, { timeseriesSelectionReducer, defaultTimeseriesSelection } from './TimeseriesSelectionContext'

const SetupTimeseriesSelection: FunctionComponent<PropsWithChildren> = (props) => {
	const [timeseriesSelection, timeseriesSelectionDispatch] = useReducer(timeseriesSelectionReducer, defaultTimeseriesSelection)
	const value = useMemo(() => (
		{timeseriesSelection, timeseriesSelectionDispatch}
	), [timeseriesSelection, timeseriesSelectionDispatch])

	// const {urlState} = useUrlState()
	// const firstUrlState = useRef(true)
	// useEffect(() => {
	// 	if (!firstUrlState.current) return
	// 	firstUrlState.current = true
	// 	if (urlState.timeRange) {
	// 		const tr = urlState.timeRange as [number, number]
	// 		timeseriesSelectionDispatch({type: 'setVisibleTimeRange', startTimeSec: tr[0], endTimeSec: tr[1]})
	// 	}
	// }, [urlState])
    return (
        <TimeseriesSelectionContext.Provider value={value}>
            {props.children}
        </TimeseriesSelectionContext.Provider>
    )
}

export default SetupTimeseriesSelection
