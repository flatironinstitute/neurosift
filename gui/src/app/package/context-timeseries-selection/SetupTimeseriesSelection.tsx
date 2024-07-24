// import { useUrlState } from '@figurl/interface'
import {
  FunctionComponent,
  PropsWithChildren,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import TimeseriesSelectionContext, {
  defaultTimeseriesSelection,
  timeseriesSelectionReducer,
} from "./TimeseriesSelectionContext";

type Props = {
  initialTimeSelection?: {
    t1?: number;
    t2?: number;
    t0?: number;
  };
};

const SetupTimeseriesSelection: FunctionComponent<PropsWithChildren<Props>> = ({
  children,
  initialTimeSelection,
}) => {
  const [timeseriesSelection, timeseriesSelectionDispatch] = useReducer(
    timeseriesSelectionReducer,
    defaultTimeseriesSelection,
  );
  const value = useMemo(
    () => ({ timeseriesSelection, timeseriesSelectionDispatch }),
    [timeseriesSelection, timeseriesSelectionDispatch],
  );

  useEffect(() => {
    if (!initialTimeSelection) return;
    if (
      initialTimeSelection.t1 !== undefined &&
      initialTimeSelection.t2 !== undefined
    ) {
      timeseriesSelectionDispatch({
        type: "setVisibleTimeRange",
        startTimeSec: initialTimeSelection.t1,
        endTimeSec: initialTimeSelection.t2,
      });
    }
    if (initialTimeSelection.t0 !== undefined) {
      timeseriesSelectionDispatch({
        type: "setFocusTime",
        currentTimeSec: initialTimeSelection.t0,
      });
    }
  }, [initialTimeSelection]);

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
      {children}
    </TimeseriesSelectionContext.Provider>
  );
};

export default SetupTimeseriesSelection;
