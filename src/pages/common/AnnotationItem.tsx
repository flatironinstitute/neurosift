import {
  Delete,
  Edit,
  ExpandLess,
  ExpandMore,
  Chat,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Annotation } from "./useResourceAnnotations";
import AnnotationItemEditForm from "./AnnotationItemEditForm";

const AnnotationItem: React.FC<{
  annotation: Annotation;
  isOwner: boolean;
  onDelete?: () => Promise<void>;
  onUpdate?: (updates: {
    title: string;
    content: string;
    tags?: string[];
  }) => Promise<void>;
  onOpenChat?: () => void;
}> = ({ annotation, isOwner, onDelete, onUpdate, onOpenChat }) => {
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

  const handleUpdate = async (updates: {
    title: string;
    content: string;
    tags?: string[];
  }) => {
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
            {annotation.tags && annotation.tags.length > 0 && (
              <Box sx={{ mt: 0.5 }}>
                {annotation.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                ))}
              </Box>
            )}
          </Typography>
        </Box>
        {isOwner && !isEditing && (
          <Box sx={{ display: "flex", gap: 1, mr: 1 }}>
            {annotation.type === "chat" && onOpenChat ? (
              <IconButton size="small" onClick={onOpenChat} title="Open chat">
                <Chat />
              </IconButton>
            ) : (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                  setExpanded(true);
                }}
                title="Edit this annotation"
              >
                <Edit />
              </IconButton>
            )}
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              disabled={isDeleting}
              title="Delete this annotation"
            >
              <Delete />
            </IconButton>
          </Box>
        )}
        {annotation.type !== "chat" && (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        )}
      </Box>

      <Collapse in={expanded}>
        {isEditing ? (
          <AnnotationItemEditForm
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

export default AnnotationItem;
