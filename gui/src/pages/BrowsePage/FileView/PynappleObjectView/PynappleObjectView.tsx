import { FunctionComponent } from "react";
import TsGroupView from "./TsGroupView";
import TsdFrameView from "./TsdFrameView";
import { SetupTimeseriesSelection } from "../../../../package/context-timeseries-selection";

type Props = {
    width: number
    height: number
    sessionPath: string
    objectName: string
    objectType: 'TsGroup' | 'TsdFrame' | 'dict'
}

const PynappleObjectView: FunctionComponent<Props> = ({width, height, sessionPath, objectName, objectType}) => {
    let view
    if (objectType === 'TsGroup') {
        view = (
            <TsGroupView
                width={width}
                height={height}
                sessionPath={sessionPath}
                objectName={objectName}
            />
        )
    }
    else if (objectType === 'TsdFrame') {
        view = (
            <TsdFrameView
                width={width}
                height={height}
                sessionPath={sessionPath}
                objectName={objectName}
            />
        )
    }
    else {
        view = (
            <div style={{position: 'absolute', width, height, background: 'white'}}>
                <div>{sessionPath}</div>
                <div>{objectName}</div>
                <div>{objectType}</div>
            </div>
        )
    }
    return view
}

export default PynappleObjectView