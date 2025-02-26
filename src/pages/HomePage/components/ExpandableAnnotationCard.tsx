import React, { useState } from "react";
import { Card, CardContent, Typography, IconButton, Box } from "@mui/material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import { Annotation } from "../../common/useResourceAnnotations";
import DandisetPage from "../../../pages/DandisetPage";
import { Link } from "react-router";
import OpenNeuroDatasetPage from "../../../pages/OpenNeuroDatasetPage/OpenNeuroDatasetPage";
import NwbPage from "../../../pages/NwbPage/NwbPage";

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
                dandisetId={
                  getDandisetIdFromTags(annotation.tags) || "no-such-tag"
                }
              />
            )}
            {annotation.targetType === "openneuro_dataset" && (
              <OpenNeuroDatasetPage
                width={width}
                height={500}
                datasetId={
                  getOpenNeuroDatasetIdFromTags(annotation.tags) ||
                  "no-such-tag"
                }
              />
            )}
            {annotation.targetType === "nwb_file" && (
              <NwbPage
                width={width}
                height={800}
                dandisetId={getDandisetIdFromTags(annotation.tags)}
                nwbUrl={getUrlFromTags(annotation.tags) || "no-such-tag"}
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
  } else if (annotation.targetType === "nwb_file") {
    return (
      <Link
        to={`/nwb?url=${getUrlFromTags(annotation.tags)}&dandisetId=${getDandisetIdFromTags(annotation.tags)}`}
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

const getDandisetIdFromTags = (tags: string[]): string | undefined => {
  const dandisetTag = tags.find((tag) => tag.startsWith("dandiset:"));
  if (!dandisetTag) return undefined;
  return dandisetTag.slice("dandiset:".length);
};

const getOpenNeuroDatasetIdFromTags = (tags: string[]): string | undefined => {
  const openneuroDatasetTag = tags.find((tag) => tag.startsWith("openneuro:"));
  if (!openneuroDatasetTag) return undefined;
  return openneuroDatasetTag.slice("openneuro:".length);
};

const getUrlFromTags = (tags: string[]): string | undefined | undefined => {
  return tags.find((tag) => tag.startsWith("url:"))?.slice("url:".length);
};

export default ExpandableAnnotationCard;
