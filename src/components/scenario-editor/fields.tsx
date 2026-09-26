"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Input, Textarea, Select, type SelectOption } from "@/components/ui";
import { Icon } from "@/components/icons";
import { cx } from "@/lib/utils";
import {
  asNum,
  asStr,
  asStrArr,
  getPath,
  parseJson,
  prettyJson,
  setDocPath,
  type Doc,
} from "./doc-utils";

export interface Ctx {
  doc: Doc;
  update: (next: Doc) => void;
  expert: boolean;
  /** JSON-pointer из сообщения проверки, если раздел — цель перехода */
  highlightPath?: string;
}

type Path = Array<string | number>;

export function SectionCard({
  title,
  hint,
  actions,
  highlight,
  className,
  children,
}: {
  title?: ReactNode;
  hint?: ReactNode;
  actions?: ReactNode;
  highlight?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cx(
        "bg-surface rounded-card border border-line p-5 flex flex-col gap-4 transition-colors duration-200",
        highlight && "bg-warning-bg border-warning",
        className,
      )}
    >
      {(title !== undefined || actions !== undefined) && (
        <div className="flex items-center gap-3">
          {title !== undefined && <h3 className="text-base font-semibold whitespace-nowrap">{title}</h3>}
          {actions !== undefined && <div className="ml-auto flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
      {hint !== undefined && <p className="text-xs text-dusk -mt-1">{hint}</p>}
    </section>
  );
}

export function PInput({
  ctx,
  path,
  label,
  placeholder,
  className,
}: {
  ctx: Ctx;
  path: Path;
  label: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <Input
      label={label}
      value={asStr(getPath(ctx.doc, path))}
      placeholder={placeholder}
      onChange={(e) => ctx.update(setDocPath(ctx.doc, path, e.target.value))}
      className={className}
    />
  );
}

export function PText({
  ctx,
  path,
  label,
  rows = 3,
  hint,
  placeholder,
}: {
  ctx: Ctx;
  path: Path;
  label: string;
  rows?: number;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <Textarea
      label={label}
      rows={rows}
      value={asStr(getPath(ctx.doc, path))}
      hint={hint}
      placeholder={placeholder}
      onChange={(e) => ctx.update(setDocPath(ctx.doc, path, e.target.value))}
    />
  );
}

export function PNum({
  ctx,
  path,
  label,
  min,
  max,
  step,
  suffix,
  widthClass = "w-24",
}: {
  ctx: Ctx;
  path: Path;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  widthClass?: string;
}) {
  const n = asNum(getPath(ctx.doc, path));
  return (
    <Input
      label={label}
      type="number"
      value={n === null ? "" : n}
      min={min}
      max={max}
      step={step}
      suffix={suffix}
      inputClassName={cx("text-right", widthClass)}
      onChange={(e) =>
        ctx.update(
          setDocPath(ctx.doc, path, e.target.value === "" ? undefined : Number(e.target.value)),
        )
      }
    />
  );
}

export function PSelect({
  ctx,
  path,
  label,
  options,
  placeholder,
  className,
}: {
  ctx: Ctx;
  path: Path;
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}) {
  const v = asStr(getPath(ctx.doc, path));
  return (
    <Select
      label={label}
      value={v}
      options={options}
      placeholder={placeholder ?? "Не задано"}
      onChange={(value) => ctx.update(setDocPath(ctx.doc, path, value))}
      className={className}
    />
  );
}

/**
 * Поле EngineObject: без эксперта — read-only pretty JSON,
 * с экспертом — редактируемая textarea с валидацией (blur фиксирует).
 */
export function JsonField({
  label,
  hint,
  value,
  onChange,
  expert,
  rows = 8,
}: {
  label: string;
  hint?: string;
  value: unknown;
  onChange?: (next: unknown) => void;
  expert: boolean;
  rows?: number;
}) {
  const pretty = prettyJson(value);
  const [text, setText] = useState(pretty);
  const [error, setError] = useState(false);
  const lastSynced = useRef(pretty);

  useEffect(() => {
    if (pretty !== lastSynced.current) {
      setText(pretty);
      setError(false);
      lastSynced.current = pretty;
    }
  }, [pretty]);

  if (!expert) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-13 font-medium">{label}</span>
        <pre className="bg-bg border border-line rounded-field p-3 font-mono text-13 text-dusk overflow-auto max-h-72 whitespace-pre-wrap break-all">
          {pretty}
        </pre>
        {hint !== undefined && <span className="text-xs text-dusk">{hint}</span>}
      </div>
    );
  }

  const handleChange = (t: string) => {
    setText(t);
    setError(!parseJson(t).ok);
  };

  const handleBlur = () => {
    const r = parseJson(text);
    if (r.ok) {
      lastSynced.current = prettyJson(r.value);
      onChange?.(r.value);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-13 font-medium">{label}</span>
      <textarea
        value={text}
        rows={rows}
        spellCheck={false}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        className={cx(
          "w-full p-3 rounded-field border bg-surface font-mono text-13 outline-none transition-colors resize-y",
          "focus:border-accent placeholder:text-gray",
          error ? "border-danger" : "border-contour",
        )}
      />
      {error ? (
        <span className="flex items-center gap-1.5 text-xs text-danger">
          <Icon name="xCircle" size={14} />
          JSON не разобран
        </span>
      ) : (
        hint !== undefined && <span className="text-xs text-dusk">{hint}</span>
      )}
    </div>
  );
}

/** Список строк с добавлением/удалением строк. */
export function StringListEditor({
  label,
  hint,
  items,
  addLabel,
  onChange,
}: {
  label: string;
  hint?: string;
  items: string[];
  addLabel: string;
  onChange: (next: string[]) => void;
}) {
  const setItem = (i: number, v: string) => {
    const next = [...items];
    next[i] = v;
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-13 font-medium">{label}</span>
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={item}
              onChange={(e) => setItem(i, e.target.value)}
              inputClassName="flex-1"
            />
            <button
              type="button"
              title="Удалить строку"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="w-8 h-8 inline-flex items-center justify-center rounded-field text-dusk hover:bg-frost transition-colors shrink-0"
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
        <div>
          <button
            type="button"
            onClick={() => onChange([...items, ""])}
            className="h-8 px-2 inline-flex items-center gap-1.5 rounded-field text-13 font-medium text-accent hover:bg-frost transition-colors"
          >
            <Icon name="plus" size={14} />
            {addLabel}
          </button>
        </div>
      </div>
      {hint !== undefined && <span className="text-xs text-dusk">{hint}</span>}
    </div>
  );
}

export function useStrList(doc: Doc, path: Path): [string[], (next: string[]) => void, (next: Doc) => void] {
  const items = asStrArr(getPath(doc, path));
  return [
    items,
    (next) => undefined,
    (next) => undefined,
  ];
}
