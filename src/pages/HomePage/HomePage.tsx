import { FunctionComponent } from "react";

type Props = {
    width: number
    height: number
}

const HomePage: FunctionComponent<Props> = ({width, height}) => {
    return (
        <div>Home</div>
    )
}

export default HomePage