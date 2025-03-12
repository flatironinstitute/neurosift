import { Box, Typography } from "@mui/material";
import React from "react";
import { Annotation } from "./useResourceAnnotations";
import AnnotationItem from "./AnnotationItem";

interface AnnotationsListProps {
  annotations: Annotation[];
  currentUserId?: string;
  onDelete?: (id: string) => Promise<void>;
  onUpdate?: (
    id: string,
    updates: { title: string; content: string; tags?: string[] },
  ) => Promise<void>;
  onOpenChat: (annotation: Annotation) => void;
}

const AnnotationsList: React.FC<AnnotationsListProps> = ({
  annotations,
  currentUserId,
  onDelete,
  onUpdate,
  onOpenChat,
}) => {
  if (annotations.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ fontStyle: "italic", mt: 1 }}>
        No notes yet
      </Typography>
    );
  }

  return (
    <Box>
      {annotations.map((annotation) => (
        <AnnotationItem
          key={annotation.id}
          annotation={annotation}
          isOwner={!!currentUserId && annotation.userId === currentUserId}
          onDelete={onDelete ? () => onDelete(annotation.id) : undefined}
          onUpdate={
            onUpdate ? (updates) => onUpdate(annotation.id, updates) : undefined
          }
          onOpenChat={
            annotation.type === "chat"
              ? () => onOpenChat(annotation)
              : undefined
          }
        />
      ))}
    </Box>
  );
};

export default AnnotationsList;
