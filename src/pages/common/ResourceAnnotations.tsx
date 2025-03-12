import React, { useState, useEffect } from "react";
import { Box, Typography, Button, Link } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { Annotation, useResourceAnnotations } from "./useResourceAnnotations";
import AnnotationsList from "./AnnotationsList";
import NewAnnotationForm from "./NewAnnotationForm";
import {
  isInNeurosiftChat,
  requestAndGetChatJsonFromNeurosiftChat,
  sendSetChatMessage,
} from "../../ai-integration/messaging/windowMessaging";

interface ResourceAnnotationsProps {
  annotationType: string;
  targetType: string;
  tags: string[];
  onAnnotationsUpdate?: (annotations: any[]) => void;
  expandBlobs: boolean;
}

const ResourceAnnotations: React.FC<ResourceAnnotationsProps> = ({
  annotationType,
  targetType,
  tags,
  onAnnotationsUpdate,
  expandBlobs,
}) => {
  const [showNewForm, setShowNewForm] = useState(false);
  const {
    annotations,
    isLoading,
    error,
    createAnnotation,
    deleteAnnotation,
    updateAnnotation,
    getCurrentUserId,
    loadAnnotationWithExpandedBlob,
  } = useResourceAnnotations(annotationType, targetType, tags, { expandBlobs });
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();

  useEffect(() => {
    const fetchUserId = async () => {
      const userId = await getCurrentUserId();
      setCurrentUserId(userId);
    };
    fetchUserId();
  }, [getCurrentUserId]);

  useEffect(() => {
    if (annotations) {
      onAnnotationsUpdate?.(annotations);
    }
  }, [annotations, onAnnotationsUpdate]);

  const handleDelete = async (id: string) => {
    await deleteAnnotation(id);
  };

  const handleUpdate = async (
    id: string,
    updates: { title: string; content: string },
  ) => {
    await updateAnnotation(id, updates);
  };

  const handleSubmitAnnotation = async (title: string, content: string) => {
    const success = await createAnnotation(title, content);
    if (success) {
      setShowNewForm(false);
    }
  };

  const handleOpenChat = async (annotation: Annotation) => {
    if (!isInNeurosiftChat()) {
      window.alert("No Neurosift chat found. See https://chat.neurosift.app");
      return;
    }
    const annotationExpanded = await loadAnnotationWithExpandedBlob(
      annotation.id,
    );
    if (!annotationExpanded) {
      return;
    }
    const chatContent = JSON.parse(annotationExpanded.data.content);
    sendSetChatMessage(JSON.stringify(chatContent));
  };

  const handleAddChat = async () => {
    if (!isInNeurosiftChat()) {
      window.alert("No Neurosift chat found. See https://chat.neurosift.app");
      return;
    }
    const chatJson = await requestAndGetChatJsonFromNeurosiftChat();
    if (!chatJson) {
      window.alert("No chat found in Neurosift chat");
      return;
    }
    const chatTitle = prompt("Enter chat title");
    if (!chatTitle) {
      return;
    }
    const success = await createAnnotation(chatTitle, chatJson);
    if (!success) {
      window.alert("Failed to create chat");
    }
  };

  if (error) {
    return (
      <Typography color="error" sx={{ mt: 1 }}>
        Error loading annotations: {error}
      </Typography>
    );
  }

  const hasApiKey = !!localStorage.getItem("neurosiftApiKey");

  return (
    <Box sx={{ mt: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="subtitle2" color="text.secondary">
          {annotationType === "note"
            ? "Notes"
            : annotationType === "chat"
              ? "Chats"
              : "Annotations"}
        </Typography>
        {!showNewForm && hasApiKey && (
          <Button
            startIcon={<AddIcon />}
            size="small"
            onClick={() => {
              if (annotationType === "note") {
                setShowNewForm(true);
              } else if (annotationType === "chat") {
                handleAddChat();
              } else {
                setShowNewForm(true);
              }
            }}
          >
            Add{" "}
            {annotationType === "note"
              ? "Note"
              : annotationType === "chat"
                ? "Chat"
                : "Annotation"}
          </Button>
        )}
      </Box>

      {!hasApiKey && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          To add or edit notes, please go to the{" "}
          <Link href="/settings">settings page</Link> and enter a Neurosift API
          key.
        </Typography>
      )}

      {showNewForm && (
        <NewAnnotationForm
          annotationType={annotationType}
          onSubmit={handleSubmitAnnotation}
          onCancel={() => setShowNewForm(false)}
        />
      )}

      {isLoading ? (
        <Typography color="text.secondary" sx={{ fontStyle: "italic", mt: 1 }}>
          Loading notes...
        </Typography>
      ) : (
        <AnnotationsList
          annotations={annotations}
          currentUserId={currentUserId}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
          onOpenChat={handleOpenChat}
        />
      )}
    </Box>
  );
};

export default ResourceAnnotations;
