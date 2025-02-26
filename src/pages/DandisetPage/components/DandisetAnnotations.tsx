import React, { useState, useEffect } from "react";
import { Box, Typography, Button } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useAnnotations } from "../hooks/useAnnotations";
import AnnotationsList from "./AnnotationsList";
import NewAnnotationForm from "./NewAnnotationForm";

interface DandisetAnnotationsProps {
  dandisetId: string;
}

const DandisetAnnotations: React.FC<DandisetAnnotationsProps> = ({
  dandisetId,
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
  } = useAnnotations(dandisetId);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();

  useEffect(() => {
    const fetchUserId = async () => {
      const userId = await getCurrentUserId();
      setCurrentUserId(userId);
    };
    fetchUserId();
  }, [getCurrentUserId]);

  const handleDelete = async (id: string) => {
    await deleteAnnotation(id);
  };

  const handleUpdate = async (
    id: string,
    updates: { title: string; content: string },
  ) => {
    await updateAnnotation(id, updates);
  };

  const handleSubmitNote = async (title: string, content: string) => {
    const success = await createAnnotation(title, content);
    if (success) {
      setShowNewForm(false);
    }
  };

  if (error) {
    return (
      <Typography color="error" sx={{ mt: 1 }}>
        Error loading notes: {error}
      </Typography>
    );
  }

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
          Notes
        </Typography>
        {!showNewForm && (
          <Button
            startIcon={<AddIcon />}
            size="small"
            onClick={() => setShowNewForm(true)}
          >
            Add Note
          </Button>
        )}
      </Box>

      {showNewForm && (
        <NewAnnotationForm
          onSubmit={handleSubmitNote}
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
        />
      )}
    </Box>
  );
};

export default DandisetAnnotations;
