import { FunctionComponent } from "react";

export type ControlButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
};

export const ControlButton: FunctionComponent<ControlButtonProps> = ({
  onClick,
  disabled = false,
  children,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: "2px 6px",
      border: "1px solid #ccc",
      borderRadius: "2px",
      fontSize: "0.85rem",
      backgroundColor: disabled ? "#f5f5f5" : "white",
      cursor: disabled ? "default" : "pointer",
    }}
  >
    {children}
  </button>
);
