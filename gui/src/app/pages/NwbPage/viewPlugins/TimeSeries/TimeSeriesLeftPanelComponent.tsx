import { FunctionComponent } from "react";
import { useNwbFile } from "../../NwbFileContext";
import useTimeSeriesInfo from "./useTimeseriesInfo";

type TimeSeriesLeftPanelComponentProps = {
    width: number;
    path: string;
};

const TimeSeriesLeftPanelComponent: FunctionComponent<TimeSeriesLeftPanelComponentProps> = ({
    path
}) => {
    const nwbFile = useNwbFile();
    const { samplingRate, duration } = useTimeSeriesInfo(nwbFile, path);
    return (
        <>
            {samplingRate && <div style={{paddingTop: 8}}>
                Rate (Hz): {samplingRate}
            </div>}
            {duration && <div style={{paddingTop: 8}}>
                Duration (s): {duration}
            </div>}
        </>
    );
}

export default TimeSeriesLeftPanelComponent;