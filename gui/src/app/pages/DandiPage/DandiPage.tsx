import { FunctionComponent } from "react"
import DandiBrowser from "./DandiBrowser/DandiBrowser"

type DandiPageProps = {
    width: number
    height: number
}

const DandiPage: FunctionComponent<DandiPageProps> = ({width, height}) => {
    return (
        <DandiBrowser
            width={width}
            height={height}
        />
    )
}

export default DandiPage