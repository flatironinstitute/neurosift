import React, { useState } from "react";
import { Card, CardContent, Typography, IconButton, Box } from "@mui/material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import { Annotation } from "../../common/useResourceAnnotations";
import DandisetPage from "../../../pages/DandisetPage";
import { Link } from "react-router";
import OpenNeuroDatasetPage from "../../../pages/OpenNeuroDatasetPage/OpenNeuroDatasetPage";

interface Props {
  annotation: Annotation;
  width: number;
}

const ExpandableAnnotationCard: React.FC<Props> = ({ annotation, width }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 2,
        "&:last-child": {
          mb: 0,
        },
      }}
    >
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Box>
            <LinkForAnnotation annotation={annotation} />
            <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
              {annotation.data.content} (highlighted:{" "}
              {new Date(annotation.updatedAt).toLocaleDateString()})
            </Typography>
          </Box>
          <IconButton
            onClick={() => setExpanded(!expanded)}
            sx={{
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.3s",
            }}
          >
            <ExpandMoreIcon />
          </IconButton>
        </Box>
        {expanded && (
          <Box sx={{ mt: 2 }}>
            {annotation.targetType === "dandiset" && (
              <DandisetPage
                width={width}
                height={500}
                dandisetId={getDandisetIdFromTags(annotation.tags)}
              />
            )}
            {annotation.targetType === "openneuro_dataset" && (
              <OpenNeuroDatasetPage
                width={width}
                height={500}
                datasetId={getOpenNeuroDatasetIdFromTags(annotation.tags)}
              />
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const LinkForAnnotation: React.FC<{ annotation: Annotation }> = ({
  annotation,
}) => {
  if (annotation.targetType === "dandiset") {
    return (
      <Link to={`/dandiset/${getDandisetIdFromTags(annotation.tags)}`}>
        <Typography variant="h6" gutterBottom>
          {annotation.title}
        </Typography>
      </Link>
    );
  } else if (annotation.targetType === "openneuro_dataset") {
    return (
      <Link
        to={`/openneuro-dataset/${getOpenNeuroDatasetIdFromTags(annotation.tags)}`}
      >
        <Typography variant="h6" gutterBottom>
          {annotation.title}
        </Typography>
      </Link>
    );
  } else {
    return (
      <Typography variant="h6" gutterBottom>
        {annotation.title}
      </Typography>
    );
  }
};

const getDandisetIdFromTags = (tags: string[]): string => {
  const dandisetTag = tags.find((tag) => tag.startsWith("dandiset:"));
  if (!dandisetTag) return "no-such-tag";
  return dandisetTag.slice("dandiset:".length);
};

const getOpenNeuroDatasetIdFromTags = (tags: string[]): string => {
  const openneuroDatasetTag = tags.find((tag) => tag.startsWith("openneuro:"));
  if (!openneuroDatasetTag) return "no-such-tag";
  return openneuroDatasetTag.slice("openneuro:".length);
};

export default ExpandableAnnotationCard;
