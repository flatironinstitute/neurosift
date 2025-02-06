import { FunctionComponent } from "react";

type ReferenceValue = {
  path: string;
  object_id: string;
  source: string;
  source_object_id: string;
};

const ReferenceComponent: FunctionComponent<{
  value: ReferenceValue;
}> = ({ value }) => {
  return (
    <span style={{ color: "darkgreen" }} title={JSON.stringify(value)}>
      {value.path}
    </span>
  );
};

export default ReferenceComponent;
