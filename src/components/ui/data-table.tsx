"use client";

import { useState, type ReactNode } from "react";
import { cx } from "@/lib/utils";
import { Checkbox } from "./checkbox";
import { IconButton } from "./button";

export interface Column<T> {
  key: string;
  title: ReactNode;
  align?: "left" | "right" | "center";
  width?: number | string;
  render?: (row: T, index: number) => ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string | number;
  onRowClick?: (row: T) => void;
  selectedKey?: string | number | null;
  selectable?: boolean;
  selectedKeys?: ReadonlySet<string | number>;
  onSelectedKeysChange?: (keys: Set<string | number>) => void;
  emptyText?: string;
  className?: string;
}

const ALIGN: Record<"left" | "right" | "center", string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  selectedKey = null,
  selectable = false,
  selectedKeys,
  onSelectedKeysChange,
  emptyText = "Нет данных",
  className,
}: DataTableProps<T>) {
  const [innerSelected, setInnerSelected] = useState<Set<string | number>>(new Set());
  const isControlled = selectedKeys !== undefined;
  const current = isControlled ? selectedKeys : innerSelected;

  const setSelected = (keys: Set<string | number>) => {
    if (!isControlled) setInnerSelected(keys);
    onSelectedKeysChange?.(keys);
  };

  const keys = rows.map(rowKey);
  const allChecked = rows.length > 0 && keys.every((k) => current.has(k));

  const toggleAll = (checked: boolean) => {
    const next = new Set(current);
    for (const k of keys) {
      if (checked) next.add(k);
      else next.delete(k);
    }
    setSelected(next);
  };

  const toggleOne = (k: string | number, checked: boolean) => {
    const next = new Set(current);
    if (checked) next.add(k);
    else next.delete(k);
    setSelected(next);
  };

  const colCount = columns.length + (selectable ? 1 : 0);

  return (
    <table className={cx("w-full border-collapse", className)}>
      <thead>
        <tr>
          {selectable && (
            <th className="h-10 px-4 bg-frost border-b border-line w-11">
              <Checkbox
                checked={allChecked}
                onChange={(checked) => toggleAll(checked)}
                label={null}
                aria-label="Выбрать все"
              />
            </th>
          )}
          {columns.map((c) => (
            <th
              key={c.key}
              className={cx("h-10 px-4 bg-frost text-13 font-medium border-b border-line", ALIGN[c.align ?? "left"])}
              style={c.width !== undefined ? { width: c.width } : undefined}
            >
              {c.title}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={colCount} className="h-11 px-4 border-b border-line text-13 text-dusk text-center">
              {emptyText}
            </td>
          </tr>
        ) : (
          rows.map((row, i) => {
            const k = rowKey(row, i);
            const selected = selectedKey === k || current.has(k);
            return (
              <tr
                key={k}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cx(
                  "transition-colors",
                  onRowClick && "cursor-pointer",
                  selected ? "bg-frost" : "hover:bg-bg"
                )}
              >
                {selectable && (
                  <td className="h-11 px-4 border-b border-line w-11" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={current.has(k)} onChange={(checked) => toggleOne(k, checked)} label={null} aria-label="Выбрать строку" />
                  </td>
                )}
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cx("h-11 px-4 border-b border-line text-13", ALIGN[c.align ?? "left"])}
                  >
                    {c.render ? c.render(row, i) : String((row as Record<string, unknown>)[c.key] ?? "")}
                  </td>
                ))}
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}

export interface PaginationProps {
  offset: number;
  limit: number;
  total: number;
  onOffsetChange: (offset: number) => void;
  className?: string;
}

export function Pagination({ offset, limit, total, onOffsetChange, className }: PaginationProps) {
  const shown = Math.min(offset + limit, total);
  return (
    <div className={cx("flex items-center gap-3 text-13 text-dusk", className)}>
      <span>
        Показано {shown} из {total}
      </span>
      <div className="ml-auto flex items-center gap-1">
        <IconButton
          name="chevL"
          size={32}
          bordered
          title="Назад"
          disabled={offset <= 0}
          onClick={() => onOffsetChange(Math.max(0, offset - limit))}
        />
        <IconButton
          name="chevR"
          size={32}
          bordered
          title="Вперёд"
          disabled={offset + limit >= total}
          onClick={() => onOffsetChange(offset + limit)}
        />
      </div>
    </div>
  );
}
