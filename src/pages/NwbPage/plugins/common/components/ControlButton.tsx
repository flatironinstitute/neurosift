import { FunctionComponent } from "react";

export type ControlButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
};

export const ControlButton: FunctionComponent<ControlButtonProps> = ({
  onClick,
  disabled = false,
  children,
  title,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: "0px 0px",
      border: "1px solid #ddd",
      borderRadius: "4px",
      fontSize: "0.85rem",
      backgroundColor: disabled ? "#f5f5f5" : "white",
      cursor: disabled ? "not-allowed" : "pointer",
      color: disabled ? "#999" : "#333",
      transition: "all 0.2s ease",
      boxShadow: disabled ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
      outline: "none",
      minWidth: "28px",
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      userSelect: "none",
    }}
    title={title}
    onMouseOver={(e) => {
      if (!disabled) {
        e.currentTarget.style.backgroundColor = "#f8f8f8";
        e.currentTarget.style.borderColor = "#ccc";
      }
    }}
    onMouseOut={(e) => {
      if (!disabled) {
        e.currentTarget.style.backgroundColor = "white";
        e.currentTarget.style.borderColor = "#ddd";
      }
    }}
  >
    {children}
  </button>
);
