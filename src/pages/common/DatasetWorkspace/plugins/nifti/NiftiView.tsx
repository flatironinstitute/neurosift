import { FunctionComponent, useState } from "react";
import { Box, Button, Alert, Typography } from "@mui/material";
import { DatasetPluginProps } from "../pluginInterface";
import NiftiViewer from "./components/NiftiViewer";

const NiftiView: FunctionComponent<DatasetPluginProps> = ({
  file,
  width,
  height,
}) => {
  const [loadState, setLoadState] = useState<
    "initial" | "confirmed" | "attempted_bypass"
  >("initial");
  const fileUrl = file.urls[0];
  const fileSizeMB = file.size / (1024 * 1024);
  const isLargeFile = fileSizeMB > 100;
  const isVeryLargeFile = fileSizeMB > 2000;

  const handleConfirm = () => {
    if (isVeryLargeFile) {
      setLoadState("attempted_bypass");
    } else {
      setLoadState("confirmed");
    }
  };

  return (
    <Box sx={{ width: "100%", height: "100%", overflow: "auto" }}>
      {loadState === "initial" ? (
        <Alert
          severity={isLargeFile ? "warning" : "info"}
          sx={{
            bgcolor: isLargeFile ? undefined : "transparent",
            color: isLargeFile ? undefined : "inherit",
            p: 4,
            m: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            fontSize: "1.2rem",
            "& .MuiAlert-message": {
              fontSize: "1.2rem",
              textAlign: "center",
              mb: 2,
            },
            ...(!isLargeFile && {
              "& .MuiAlert-icon": {
                color: "inherit",
              },
            }),
            maxWidth: 500,
          }}
          action={
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={handleConfirm}
              sx={{ mt: 2 }}
            >
              {isVeryLargeFile
                ? "Bypass Warning"
                : isLargeFile
                  ? "Load Anyway"
                  : "Load"}
            </Button>
          }
        >
          <>
            This NIFTI file is {fileSizeMB.toFixed(1)} MB in size.
            <br />
            <br />
            {isLargeFile || isVeryLargeFile
              ? "Loading large files may impact performance."
              : "Click to proceed with loading the file."}
          </>
        </Alert>
      ) : loadState === "attempted_bypass" ? (
        <Alert
          severity="warning"
          sx={{
            p: 4,
            m: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            fontSize: "1.2rem",
            "& .MuiAlert-message": {
              fontSize: "1.2rem",
              textAlign: "center",
              mb: 2,
            },
            maxWidth: 500,
          }}
        >
          Actually just kidding, I&apos;m not going to let you load that file
          because {fileSizeMB.toFixed(1)} MB is too big. If you really want to
          load this file, file an issue or create a PR.
        </Alert>
      ) : (
        <NiftiViewer
          fileUrl={fileUrl}
          width={(width || 600) - 30}
          height={height}
        />
      )}
    </Box>
  );
};

export default NiftiView;
