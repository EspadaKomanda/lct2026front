import type { ReactNode } from "react";
import { cx } from "@/lib/utils";
import { Icon } from "@/components/icons";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label?: ReactNode;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  id?: string;
  className?: string;
  selectClassName?: string;
}

export function Select({
  label,
  value,
  defaultValue,
  onChange,
  options,
  placeholder,
  disabled,
  error,
  id,
  className,
  selectClassName,
}: SelectProps) {
  const inner = (
    <div className="relative">
      <select
        id={id}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className={cx(
          "appearance-none w-full h-9 pl-3 pr-8 rounded-field border bg-surface text-sm outline-none transition-colors",
          "focus:border-accent disabled:bg-bg disabled:border-line disabled:text-dusk disabled:cursor-not-allowed",
          error ? "border-danger" : "border-contour",
          selectClassName
        )}
      >
        {placeholder !== undefined && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-dusk pointer-events-none">
        <Icon name="chevD" size={14} />
      </span>
    </div>
  );
  if (!label) {
    return <div className={className}>{inner}</div>;
  }
  return (
    <label className={cx("flex flex-col gap-1.5 text-13 font-medium", className)}>
      <span>{label}</span>
      {inner}
    </label>
  );
}
