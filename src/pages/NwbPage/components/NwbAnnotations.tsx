import React from "react";
import ResourceAnnotations from "../../common/ResourceAnnotations";

interface NwbAnnotationsProps {
  nwbUrl: string;
  dandisetId?: string;
}

const NwbAnnotations: React.FC<NwbAnnotationsProps> = ({
  nwbUrl,
  dandisetId,
}) => {
  const tags = [
    `url:${nwbUrl}`,
    ...(dandisetId ? [`dandiset:${dandisetId}`] : []),
  ];

  return (
    <ResourceAnnotations
      annotationType="note"
      targetType="nwb_file"
      tags={tags}
      expandBlobs={true}
    />
  );
};

export default NwbAnnotations;
