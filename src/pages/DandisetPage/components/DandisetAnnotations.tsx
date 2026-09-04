import React from "react";
import ResourceAnnotations from "../../common/ResourceAnnotations";
import { ResourceAnnotation } from "../../common/annotationTypes";
import { isInNeurosiftChat } from "../../../ai-integration/messaging/windowMessaging";

interface DandisetAnnotationsProps {
  dandisetId: string;
  onNoteAnnotationsUpdate?: (annotations: ResourceAnnotation[]) => void;
}

const DandisetAnnotations: React.FC<DandisetAnnotationsProps> = ({
  dandisetId,
  onNoteAnnotationsUpdate,
}) => {
  return (
    <>
      <ResourceAnnotations
        annotationType="note"
        targetType="dandiset"
        tags={[`dandiset:${dandisetId}`]}
        onAnnotationsUpdate={onNoteAnnotationsUpdate}
        expandBlobs={true}
      />
      {isInNeurosiftChat() && (
        <ResourceAnnotations
          annotationType="chat"
          targetType="dandiset"
          tags={[`dandiset:${dandisetId}`]}
          onAnnotationsUpdate={undefined}
          expandBlobs={false}
        />
      )}
    </>
  );
};

export default DandisetAnnotations;
