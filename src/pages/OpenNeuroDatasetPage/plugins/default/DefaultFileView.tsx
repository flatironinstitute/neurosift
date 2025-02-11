import { Box, Button, Typography } from "@mui/material";
import { FunctionComponent } from "react";
import { formatBytes } from "@shared/util/formatBytes";
import { DatasetPluginProps } from "../pluginInterface";
import FileDownloadIcon from "@mui/icons-material/FileDownload";

const DefaultFileView: FunctionComponent<DatasetPluginProps> = ({ file }) => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        {file.filename.split("/").pop()}
      </Typography>

      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          File Information
        </Typography>
        <Box sx={{ ml: 2 }}>
          <Typography>
            <strong>Path:</strong> {file.filename}
          </Typography>
          <Typography>
            <strong>Size:</strong> {formatBytes(file.size)}
          </Typography>
          <Typography>
            <strong>ID:</strong> {file.id}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Download Options
        </Typography>
        <Box sx={{ ml: 2 }}>
          {file.urls.map((url, index) => (
            <Box key={index} sx={{ mb: 1 }}>
              <Button
                variant="outlined"
                startIcon={<FileDownloadIcon />}
                onClick={() => window.open(url, "_blank")}
                size="small"
              >
                Download {index > 0 ? `(Mirror ${index + 1})` : ""}
              </Button>
            </Box>
          ))}
        </Box>
      </Box>

      {file.filename.match(/\.(jpg|jpeg|png|gif)$/i) && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Preview
          </Typography>
          <Box sx={{ mt: 1 }}>
            <img
              src={file.urls[0]}
              alt={file.filename}
              style={{
                maxWidth: "100%",
                maxHeight: "500px",
                objectFit: "contain",
              }}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default DefaultFileView;
