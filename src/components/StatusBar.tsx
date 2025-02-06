import { useEffect, useState } from "react";
import {
  getStatusItems,
  registerStatusCallback,
  type StatusBarItem,
} from "./StatusBarContext";

const StatusBar: React.FC = () => {
  const [items, setItems] = useState(getStatusItems());

  useEffect(() => {
    // Register callback and store cleanup function
    const unregister = registerStatusCallback((newItems) => {
      setItems(newItems);
    });
    // Cleanup on unmount
    return unregister;
  }, []);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#f0f0f0",
        display: "flex",
        alignItems: "center",
        padding: "0 10px",
        gap: 15,
        boxSizing: "border-box",
        fontSize: 8,
      }}
    >
      {Object.entries(items).map(([name, item]) => (
        <StatusBarItemView key={name} item={item} />
      ))}
    </div>
  );
};

const StatusBarItemView: React.FC<{ item: StatusBarItem }> = ({ item }) => {
  if (item.type === "text") {
    return <span>{item.text}</span>;
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span>{item.label}</span>
      <div
        style={{
          width: 100,
          height: 10,
          backgroundColor: "#ddd",
          borderRadius: 5,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${item.progress}%`,
            height: "100%",
            backgroundColor: "#007bff",
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
};

export default StatusBar;
