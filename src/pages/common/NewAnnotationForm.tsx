import { useState } from "react";
import { Box, Button, TextField, Typography } from "@mui/material";
import ReactMarkdown from "react-markdown";

interface NewAnnotationFormProps {
  annotationType: string;
  onSubmit: (title: string, content: string) => Promise<void>;
  onCancel: () => void;
}

const NewAnnotationForm: React.FC<NewAnnotationFormProps> = ({
  annotationType,
  onSubmit,
  onCancel,
}) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPreview, setIsPreview] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && content.trim()) {
      await onSubmit(title.trim(), content.trim());
      setTitle("");
      setContent("");
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        my: 2,
        borderRadius: 1,
        p: 2,
        backgroundColor: "background.paper",
      }}
    >
      <TextField
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        fullWidth
        required
        size="small"
      />

      <Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
          <Button
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            size="small"
          >
            {isPreview ? "Edit" : "Preview"}
          </Button>
        </Box>

        {isPreview ? (
          <Box
            sx={{
              minHeight: "100px",
              p: 2,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
            }}
          >
            {content ? (
              <ReactMarkdown>{content}</ReactMarkdown>
            ) : (
              <Typography color="text.secondary" sx={{ fontStyle: "italic" }}>
                No content to preview
              </Typography>
            )}
          </Box>
        ) : (
          <TextField
            multiline
            rows={4}
            label="Content (Markdown supported)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            fullWidth
            required
          />
        )}
      </Box>

      <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
        <Button type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={!title.trim() || !content.trim()}
        >
          Add{" "}
          {annotationType === "note"
            ? "Note"
            : annotationType === "chat"
              ? "Chat"
              : "Annotation"}
        </Button>
      </Box>
    </Box>
  );
};

export default NewAnnotationForm;
