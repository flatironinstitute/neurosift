import { Box, LinearProgress, Typography } from "@mui/material";
import { FunctionComponent } from "react";

interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
}

const ProgressBar: FunctionComponent<ProgressBarProps> = ({
  progress,
  label,
}) => {
  return (
    <Box sx={{ width: "100%", mt: 2, mb: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {label || "Loading..."} ({Math.round(progress)}%)
        </Typography>
      </Box>
      <LinearProgress variant="determinate" value={progress} />
    </Box>
  );
};

export default ProgressBar;
