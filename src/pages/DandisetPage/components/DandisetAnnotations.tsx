import React from "react";
import ResourceAnnotations from "../../common/ResourceAnnotations";

interface DandisetAnnotationsProps {
  dandisetId: string;
}

const DandisetAnnotations: React.FC<DandisetAnnotationsProps> = ({
  dandisetId,
}) => {
  return (
    <ResourceAnnotations
      targetType="dandiset"
      tags={[`dandiset:${dandisetId}`]}
    />
  );
};

export default DandisetAnnotations;
