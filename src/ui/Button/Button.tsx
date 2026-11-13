import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  MouseEvent,
  ReactNode,
} from "react";
import { Icon, type IconName } from "../Icon/Icon";
import { Spinner } from "../Spinner/Spinner";
import "../control.css";
import "./Button.css";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "destructive"
  | "link";
export type ButtonSize = "lg" | "md" | "sm";

interface CommonProps {
  /** link is an action inside running text, at the text's size, so size doesn't apply. */
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  children: ReactNode;
}

type Unstyled<T> = Omit<T, "className" | "style" | "children">;

type ActionProps = CommonProps &
  Unstyled<ButtonHTMLAttributes<HTMLButtonElement>> & {
    href?: undefined;
    loading?: boolean;
    /** Makes it a toggle, such as Helpful: sets aria-pressed and the pressed look. */
    pressed?: boolean;
  };

type LinkProps = CommonProps &
  Unstyled<AnchorHTMLAttributes<HTMLAnchorElement>> & {
    href: string;
  };

export type ButtonProps = ActionProps | LinkProps;

const classes = (variant: ButtonVariant, size: ButtonSize) =>
  variant === "link"
    ? "ns-button ns-button--link"
    : `ns-button ns-button--${variant} ns-button--${size}`;

export function Button(props: ButtonProps) {
  if (props.href !== undefined) {
    const {
      variant = "secondary",
      size = "md",
      icon,
      children,
      ...link
    } = props;
    return (
      <a {...link} className={classes(variant, size)}>
        {icon && <Icon name={icon} />}
        {children}
      </a>
    );
  }
  const {
    variant = "secondary",
    size = "md",
    icon,
    children,
    loading = false,
    pressed,
    type = "button",
    onClick,
    ...native
  } = props;
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (loading) event.preventDefault();
    else onClick?.(event);
  };
  return (
    <button
      {...native}
      type={type}
      className={classes(variant, size)}
      aria-busy={loading || undefined}
      aria-pressed={pressed}
      data-spinner={loading && !icon ? "center" : undefined}
      onClick={handleClick}
    >
      {loading ? <Spinner /> : icon && <Icon name={icon} />}
      <span className="ns-button-label">{children}</span>
    </button>
  );
}
