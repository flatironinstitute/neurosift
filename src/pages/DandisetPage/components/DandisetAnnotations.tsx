import React from "react";
import ResourceAnnotations from "../../common/ResourceAnnotations";
import { isInNeurosiftChat } from "src/ai-integration/messaging/windowMessaging";

interface DandisetAnnotationsProps {
  dandisetId: string;
  onNoteAnnotationsUpdate?: (annotations: any[]) => void;
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
