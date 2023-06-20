import { FunctionComponent } from "react";
import { SetupTimeseriesSelection } from "../../../../package/context-timeseries-selection";
import PynappleObjectView from "./PynappleObjectView";

type Props = {
    width: number
    height: number
    sessionPath: string
    objects: {
        name: string
        type: 'TsGroup' | 'TsdFrame' | 'dict'
    }[]
}

const PynappleObjectsView: FunctionComponent<Props> = ({width, height, sessionPath, objects}) => {
    const heightPerObject = height / objects.length
    return (
        <div style={{position: 'absolute', width, height, background: 'white'}}>
            {
                objects.map((obj, ii) => (
                    <div key={ii} style={{position: 'absolute', left: 0, top: ii * heightPerObject, width, height: heightPerObject}}>
                        <PynappleObjectView
                            width={width}
                            height={heightPerObject}
                            sessionPath={sessionPath}
                            objectName={obj.name}
                            objectType={obj.type}
                        />
                    </div>
                ))
            }
        </div>
    )
}

export default PynappleObjectsView