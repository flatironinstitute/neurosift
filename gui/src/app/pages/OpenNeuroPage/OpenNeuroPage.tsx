import { FunctionComponent } from "react";
import OpenNeuroBrowser from "./OpenNeuroBrowser";

type OpenNeuroPageProps = {
    width: number;
    height: number;
}

const OpenNeuroPage: FunctionComponent<OpenNeuroPageProps> = ({ width, height }) => {
    return <OpenNeuroBrowser width={width} height={height} />;
};

export default OpenNeuroPage;