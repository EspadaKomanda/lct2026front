import type { ReactNode } from "react";
import { cx } from "@/lib/utils";

export interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
  id?: string;
  className?: string;
  "aria-label"?: string;
}

export function Checkbox({ checked, defaultChecked, onChange, label, disabled, id, className, "aria-label": ariaLabel }: CheckboxProps) {
  return (
    <label className={cx("inline-flex items-center gap-2 text-sm cursor-pointer select-none", disabled && "cursor-not-allowed", className)}>
      <input
        type="checkbox"
        id={id}
        className="w-4 h-4 accent-accent"
        aria-label={ariaLabel}
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
      />
      {label !== undefined && <span className={cx(disabled && "text-gray")}>{label}</span>}
    </label>
  );
}

export interface RadioProps {
  name?: string;
  value?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (value: string) => void;
  label?: ReactNode;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function Radio({ name, value, checked, defaultChecked, onChange, label, disabled, id, className }: RadioProps) {
  return (
    <label className={cx("inline-flex items-center gap-2 text-sm cursor-pointer select-none", disabled && "cursor-not-allowed", className)}>
      <input
        type="radio"
        id={id}
        name={name}
        value={value}
        className="w-4 h-4 accent-accent"
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onChange={onChange && value !== undefined ? () => onChange(value) : undefined}
      />
      {label !== undefined && <span className={cx(disabled && "text-gray")}>{label}</span>}
    </label>
  );
}

export interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  title?: string;
  "aria-label"?: string;
  className?: string;
}

export function Switch({ checked = false, onChange, disabled, title, "aria-label": ariaLabel, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel ?? title}
      title={title}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cx(
        "relative w-9 h-5 rounded-full transition-colors duration-[160ms] disabled:opacity-50 disabled:cursor-not-allowed",
        checked ? "bg-accent" : "bg-line",
        className
      )}
    >
      <span
        className={cx(
          "absolute left-[3px] top-[3px] w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-[160ms]",
          checked ? "translate-x-[16px]" : "translate-x-0"
        )}
      />
    </button>
  );
}
