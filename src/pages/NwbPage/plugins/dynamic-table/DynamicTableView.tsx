import { useCallback, useEffect, useRef, useState } from "react";
import { useHdf5Group } from "@hdf5Interface";
import DynamicTable from "./DynamicTable/DynamicTable";

const DynamicTableView: React.FC<{ nwbUrl: string; path: string }> = ({
  nwbUrl,
  path,
}) => {
  const [width, setWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateWidth = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setWidth(rect.width);
  }, []);

  useEffect(() => {
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [updateWidth]);

  const group = useHdf5Group(nwbUrl, path);
  return (
    <div ref={containerRef} style={{ width: "100%", height: 350 }}>
      {group ? (
        <DynamicTable
          width={width}
          height={350}
          nwbUrl={nwbUrl}
          path={group.path}
        />
      ) : (
        <div>Loading group...</div>
      )}
    </div>
  );
};

export default DynamicTableView;
