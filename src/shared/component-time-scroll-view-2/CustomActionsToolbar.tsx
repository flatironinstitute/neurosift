import { FunctionComponent } from "react";
import { CustomToolbarAction } from "./TimeScrollToolbar";

type Props = {
  width: number;
  height: number;
  customActions?: CustomToolbarAction[];
};

const CustomActionsToolbar: FunctionComponent<Props> = ({
  width,
  height,
  customActions,
}) => {
  if (!customActions || customActions.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: "#f8f9fa",
        borderTop: "1px solid #dee2e6",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "0 12px",
        fontSize: "13px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {customActions.map((action) => (
          <button
            key={action.id}
            onClick={action.onClick}
            style={{
              padding: "4px 8px",
              border: "1px solid #ced4da",
              borderRadius: "4px",
              backgroundColor: action.isActive ? "#007bff" : "#ffffff",
              color: action.isActive ? "#ffffff" : "#495057",
              cursor: action.onClick ? "pointer" : "default",
              fontSize: "12px",
              fontWeight: "500",
              transition: "all 0.15s ease",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
            title={action.tooltip || action.label}
            onMouseEnter={(e) => {
              if (!action.isActive && action.onClick) {
                e.currentTarget.style.backgroundColor = "#e9ecef";
              }
            }}
            onMouseLeave={(e) => {
              if (!action.isActive && action.onClick) {
                e.currentTarget.style.backgroundColor = "#ffffff";
              }
            }}
          >
            {action.icon && <span>{action.icon}</span>}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CustomActionsToolbar;
