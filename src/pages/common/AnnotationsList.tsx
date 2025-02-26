import React, { useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Collapse,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { ExpandMore, ExpandLess, Edit, Delete } from "@mui/icons-material";
import ReactMarkdown from "react-markdown";
import { Annotation } from "./useResourceAnnotations";

interface AnnotationsListProps {
  annotations: Annotation[];
  currentUserId?: string;
  onDelete?: (id: string) => Promise<void>;
  onUpdate?: (
    id: string,
    updates: { title: string; content: string },
  ) => Promise<void>;
}

interface EditFormProps {
  annotation: Annotation;
  onSubmit: (updates: { title: string; content: string }) => Promise<void>;
  onCancel: () => void;
}

const EditForm: React.FC<EditFormProps> = ({
  annotation,
  onSubmit,
  onCancel,
}) => {
  const [title, setTitle] = useState(annotation.title);
  const [content, setContent] = useState(annotation.data.content);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({ title, content });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <TextField
        fullWidth
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        margin="normal"
        variant="outlined"
        size="small"
      />
      <TextField
        fullWidth
        label="Content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        margin="normal"
        variant="outlined"
        multiline
        rows={4}
      />
      <Box sx={{ mt: 2, display: "flex", gap: 1, justifyContent: "flex-end" }}>
        <Button onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitting}
        >
          Save
        </Button>
      </Box>
    </Box>
  );
};

const AnnotationItem: React.FC<{
  annotation: Annotation;
  isOwner: boolean;
  onDelete?: () => Promise<void>;
  onUpdate?: (updates: { title: string; content: string }) => Promise<void>;
}> = ({ annotation, isOwner, onDelete, onUpdate }) => {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    if (!onDelete || isDeleting) return;
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!onDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleUpdate = async (updates: { title: string; content: string }) => {
    if (!onUpdate) return;
    await onUpdate(updates);
    setIsEditing(false);
  };

  return (
    <Box sx={{ mb: 2, backgroundColor: "background.paper", borderRadius: 1 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          p: 1,
          cursor: "pointer",
          "&:hover": {
            backgroundColor: "action.hover",
          },
        }}
        onClick={() => !isEditing && setExpanded(!expanded)}
      >
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: "medium" }}>
            {annotation.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            By: {annotation.userName || annotation.userId} •{" "}
            {new Date(annotation.createdAt).toLocaleDateString()}
          </Typography>
        </Box>
        {isOwner && !isEditing && (
          <Box sx={{ display: "flex", gap: 1, mr: 1 }}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
                setExpanded(true);
              }}
            >
              <Edit />
            </IconButton>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              disabled={isDeleting}
            >
              <Delete />
            </IconButton>
          </Box>
        )}
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        {isEditing ? (
          <EditForm
            annotation={annotation}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
            <ReactMarkdown>{annotation.data.content}</ReactMarkdown>
          </Box>
        )}
      </Collapse>

      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
      >
        <DialogTitle>Delete Note</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this note? This action cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            disabled={isDeleting}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const AnnotationsList: React.FC<AnnotationsListProps> = ({
  annotations,
  currentUserId,
  onDelete,
  onUpdate,
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
        />
      ))}
    </Box>
  );
};

export default AnnotationsList;
