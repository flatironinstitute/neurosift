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
    <ResourceAnnotations targetId={nwbUrl} targetType="nwb_file" tags={tags} />
  );
};

export default NwbAnnotations;
