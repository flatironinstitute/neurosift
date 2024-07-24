import { FunctionComponent } from "react";
import useRoute from "../../useRoute";
import EphysSummaryPluginPage from "./EphysSummaryPluginPage";

type PluginPageProps = {
  width: number;
  height: number;
};

const PluginPage: FunctionComponent<PluginPageProps> = ({ width, height }) => {
  const { route } = useRoute();
  if (route.page !== "plugin")
    throw Error("Unexpected route for PluginPage: " + route.page);
  if (route.plugin === "EphysSummary") {
    return <EphysSummaryPluginPage width={width} height={height} />;
  } else {
    return <div>Plugin not found: {route.plugin}</div>;
  }
};

export default PluginPage;
