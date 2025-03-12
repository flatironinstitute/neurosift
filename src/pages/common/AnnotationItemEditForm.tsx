import { Box, Button, Chip, Stack, TextField, Typography } from "@mui/material";
import React, { useState } from "react";
import { Annotation } from "./useResourceAnnotations";

interface AnnotationItemEditFormProps {
  annotation: Annotation;
  onSubmit: (updates: {
    title: string;
    content: string;
    tags?: string[];
  }) => Promise<void>;
  onCancel: () => void;
}

const AnnotationItemEditForm: React.FC<AnnotationItemEditFormProps> = ({
  annotation,
  onSubmit,
  onCancel,
}) => {
  const [title, setTitle] = useState(annotation.title);
  const [content, setContent] = useState(annotation.data.content);
  const [tags, setTags] = useState<string[]>(annotation.tags || []);
  const [newTag, setNewTag] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({ title, content, tags });
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
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Tags
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          sx={{ mb: 1, flexWrap: "wrap", gap: 1 }}
        >
          {tags.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              onDelete={() => handleRemoveTag(tag)}
              size="small"
            />
          ))}
        </Stack>
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <TextField
            size="small"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTag();
              }
            }}
            placeholder="Add a tag"
          />
          <Button onClick={handleAddTag} variant="outlined" size="small">
            Add
          </Button>
        </Box>
      </Box>
      <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
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

export default AnnotationItemEditForm;
