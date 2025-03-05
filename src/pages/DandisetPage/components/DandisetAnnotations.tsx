import React from "react";
import ResourceAnnotations from "../../common/ResourceAnnotations";

interface DandisetAnnotationsProps {
  dandisetId: string;
  onAnnotationsUpdate?: (annotations: any[]) => void;
}

const DandisetAnnotations: React.FC<DandisetAnnotationsProps> = ({
  dandisetId,
  onAnnotationsUpdate,
}) => {
  return (
    <ResourceAnnotations
      targetType="dandiset"
      tags={[`dandiset:${dandisetId}`]}
      onAnnotationsUpdate={onAnnotationsUpdate}
    />
  );
};

export default DandisetAnnotations;
