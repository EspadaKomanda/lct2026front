import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cx } from "@/lib/utils";
import { Icon } from "@/components/icons";

const FIELD =
  "w-full rounded-field border bg-surface text-sm outline-none transition-colors placeholder:text-gray " +
  "focus:border-accent disabled:bg-bg disabled:border-line disabled:text-dusk disabled:cursor-not-allowed " +
  "read-only:bg-bg read-only:border-line read-only:text-dusk";

function fieldBorder(error?: string | boolean, highlight?: boolean) {
  if (error) return "border-danger";
  if (highlight) return "border-warning bg-warning-bg";
  return "border-contour";
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  highlight?: boolean;
  suffix?: string;
  inputClassName?: string;
}

export function Input({
  label,
  hint,
  error,
  highlight = false,
  suffix,
  className,
  inputClassName,
  id,
  disabled,
  readOnly,
  ...rest
}: InputProps) {
  const inner = (
    <>
      <div className="relative">
        <input
          id={id}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={error ? true : undefined}
          className={cx(FIELD, "h-9 px-3", suffix && "pr-10", fieldBorder(error, highlight), inputClassName)}
          {...rest}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-13 text-dusk pointer-events-none">{suffix}</span>
        )}
      </div>
      {error ? (
        <span className="flex items-center gap-1.5 text-xs text-danger">
          <Icon name="xCircle" size={14} />
          {error}
        </span>
      ) : (
        hint && <span className="text-xs text-dusk">{hint}</span>
      )}
    </>
  );
  if (!label) {
    return (
      <div className={cx("flex flex-col gap-1.5", className)}>
        {inner}
      </div>
    );
  }
  return (
    <label className={cx("flex flex-col gap-1.5 text-13 font-medium", className)}>
      <span>{label}</span>
      {inner}
    </label>
  );
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  highlight?: boolean;
}

export function Textarea({
  label,
  hint,
  error,
  highlight = false,
  className,
  id,
  disabled,
  readOnly,
  ...rest
}: TextareaProps) {
  const inner = (
    <>
      <textarea
        id={id}
        disabled={disabled}
        readOnly={readOnly}
        aria-invalid={error ? true : undefined}
        className={cx(FIELD, "p-2 resize-y min-h-[90px]", fieldBorder(error, highlight))}
        {...rest}
      />
      {error ? (
        <span className="flex items-center gap-1.5 text-xs text-danger">
          <Icon name="xCircle" size={14} />
          {error}
        </span>
      ) : (
        hint && <span className="text-xs text-dusk">{hint}</span>
      )}
    </>
  );
  if (!label) {
    return (
      <div className={cx("flex flex-col gap-1.5", className)}>
        {inner}
      </div>
    );
  }
  return (
    <label className={cx("flex flex-col gap-1.5 text-13 font-medium", className)}>
      <span>{label}</span>
      {inner}
    </label>
  );
}

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type"> {
  inputClassName?: string;
}

export function SearchInput({ className, inputClassName, ...rest }: SearchInputProps) {
  return (
    <div className={cx("relative", className)}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dusk pointer-events-none">
        <Icon name="search" size={16} />
      </span>
      <input
        type="search"
        className={cx(FIELD, "h-9 pl-9 pr-3", "border-contour", inputClassName)}
        {...rest}
      />
    </div>
  );
}
