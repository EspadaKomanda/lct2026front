import type { ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/utils";
import { Icon, type IconName } from "@/components/icons";
import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "secondary" | "text" | "danger";
export type ButtonSize = "md" | "sm" | "xs";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

const SIZE: Record<ButtonSize, string> = {
  md: "h-10 px-4 text-sm font-medium",
  sm: "h-9 px-3.5 text-sm",
  xs: "h-8 px-3 text-13",
};

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover active:bg-accent-active",
  secondary: "border border-contour bg-surface hover:bg-frost",
  text: "text-accent text-13 px-1 hover:text-accent-hover",
  danger: "bg-danger text-white hover:bg-danger-hover",
};

const DISABLED: Record<ButtonVariant, string> = {
  primary: "bg-[#F1F3F6] text-gray border-0 hover:bg-[#F1F3F6]",
  secondary: "bg-[#F1F3F6] text-gray border-line hover:bg-[#F1F3F6]",
  text: "text-gray hover:text-gray",
  danger: "bg-[#F1F3F6] text-gray border-0 hover:bg-[#F1F3F6]",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  disabledReason,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      disabled={isDisabled}
      title={disabledReason}
      aria-busy={loading || undefined}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-field whitespace-nowrap",
        "transition-[color,background-color,border-color,transform] duration-[140ms] [transition-timing-function:cubic-bezier(.23,1,.32,1)]",
        "active:scale-[.98] disabled:active:scale-100",
        SIZE[size],
        VARIANT[variant],
        isDisabled && cx("cursor-not-allowed", DISABLED[variant]),
        loading && "opacity-70",
        className
      )}
      {...rest}
    >
      {loading && <Spinner size={16} light={variant === "primary" || variant === "danger"} />}
      {children}
    </button>
  );
}

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title" | "children"> {
  name: IconName;
  iconSize?: number;
  size?: 40 | 36 | 32;
  bordered?: boolean;
  title: string;
}

const ICON_SIZE: Record<40 | 36 | 32, string> = {
  40: "w-10 h-10",
  36: "w-9 h-9",
  32: "w-8 h-8",
};

export function IconButton({
  name,
  iconSize = 16,
  size = 36,
  bordered = false,
  title,
  className,
  disabled,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      title={title}
      aria-label={title}
      disabled={disabled}
      className={cx(
        "inline-flex items-center justify-center rounded-field transition-colors duration-[140ms]",
        "hover:bg-frost disabled:hover:bg-transparent disabled:text-gray disabled:cursor-not-allowed",
        bordered && "border border-contour bg-surface",
        ICON_SIZE[size],
        className
      )}
      {...rest}
    >
      <Icon name={name} size={iconSize} />
    </button>
  );
}
