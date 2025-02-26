import React from "react";
import { Box, Typography, Paper } from "@mui/material";
import { useResourceAnnotations } from "../../common/useResourceAnnotations";
import ExpandableAnnotationCard from "./ExpandableAnnotationCard";

const HighlightedViews: React.FC<{ width: number }> = ({ width }) => {
  const { annotations, isLoading, error } = useResourceAnnotations(undefined, [
    "highlighted",
  ]);

  // Sort annotations by updatedAt, most recent first
  const sortedAnnotations = [...annotations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  if (error) {
    return (
      <Typography color="error" sx={{ mt: 1 }}>
        Error loading highlighted views: {error}
      </Typography>
    );
  }

  if (isLoading) {
    return (
      <Typography color="text.secondary" sx={{ fontStyle: "italic", mt: 1 }}>
        Loading highlighted views...
      </Typography>
    );
  }

  if (sortedAnnotations.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        No highlighted views yet
      </Typography>
    );
  }

  return (
    <Paper
      elevation={1}
      sx={{
        p: 3,
        mt: 4,
        mb: 4,
        backgroundColor: "rgba(0, 0, 0, 0.02)",
        borderLeft: "4px solid primary.main",
      }}
    >
      <Box sx={{ mt: 2 }}>
        {sortedAnnotations.map((annotation) => (
          <ExpandableAnnotationCard
            width={width - 80}
            key={annotation.id}
            annotation={annotation}
          />
        ))}
      </Box>
    </Paper>
  );
};

export default HighlightedViews;
