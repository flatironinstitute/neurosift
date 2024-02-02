import { FunctionComponent } from "react";
import { FaGithub } from "react-icons/fa";
import Hyperlink from "../../components/Hyperlink";

type Props = {
    width: number
    height: number
}

const HomePage: FunctionComponent<Props> = ({width, height}) => {
    return (
        <div style={{padding: 20}}>
            <h2>Welcome to Neurosift</h2>
            <p><Hyperlink href="https://github.com/flatironinstitute/neurosift/blob/main/README.md" target="_blank">About this project</Hyperlink></p>
            <p><FaGithub /> Please <Hyperlink href="https://github.com/flatironinstitute/neurosift" target="_blank">star us</Hyperlink> on GitHub.</p>
            <hr />
        </div>
    )
}

export default HomePage