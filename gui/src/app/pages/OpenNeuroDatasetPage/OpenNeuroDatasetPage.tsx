import useRoute from "app/useRoute";
import { FunctionComponent } from "react";

type OpenNeuroDatasetPageProps = {
  width: number;
  height: number;
};

const OpenNeuroDatasetPage: FunctionComponent<OpenNeuroDatasetPageProps> = ({
  width,
  height,
}) => {
  const { route } = useRoute();
  if (route.page !== "openneuro-dataset")
    throw new Error("Unexpected page in route");
  return <div />;
};

export default OpenNeuroDatasetPage;
