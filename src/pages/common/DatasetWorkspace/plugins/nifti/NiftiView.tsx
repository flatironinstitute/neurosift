import { EmptyState } from "@ui";
import { FunctionComponent, useState } from "react";
import { DatasetPluginProps } from "../pluginInterface";
import NiftiViewer from "./components/NiftiViewer";

const NiftiView: FunctionComponent<DatasetPluginProps> = ({
  file,
  width,
  height,
}) => {
  const [confirmed, setConfirmed] = useState(false);
  const fileSizeMB = file.size / (1024 * 1024);
  const isLargeFile = fileSizeMB > 100;
  const isVeryLargeFile = fileSizeMB > 2000;
  const size = `${fileSizeMB.toFixed(1)} MB`;

  if (confirmed)
    return (
      <NiftiViewer
        fileUrl={file.urls[0]}
        width={(width || 600) - 30}
        height={height}
      />
    );
  return (
    <EmptyState
      icon="image"
      title={`Load this ${size} file?`}
      action={{
        label: isVeryLargeFile
          ? `Load ${size} anyway (not recommended)`
          : isLargeFile
            ? `Load ${size} anyway`
            : `Load ${size}`,
        onClick: () => setConfirmed(true),
      }}
    >
      {isLargeFile
        ? "The volume is read in your browser, and a file this large may be slow or fail to load."
        : "The volume is read in your browser, so it waits until you ask."}
    </EmptyState>
  );
};

export default NiftiView;
