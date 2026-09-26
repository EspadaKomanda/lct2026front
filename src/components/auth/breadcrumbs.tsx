"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cx } from "@/lib/utils";

interface Crumb {
  label: string;
  href?: string;
}

const SETTINGS_LABEL: Record<string, string> = {
  profiles: "Профили тренажёра",
  access: "Доступ",
  audit: "Журнал",
  portal: "Портал",
};

export function breadcrumbsFor(pathname: string, title: string | null): Crumb[] {
  const t = title?.trim() || null;
  if (pathname === "/scenarios") return [{ label: "Сценарии" }];
  if (pathname === "/scenarios/new")
    return [
      { label: "Сценарии", href: "/scenarios" },
      { label: "Новый сценарий" },
    ];
  if (/^\/scenarios\/[^/]+\/rehearsals\/[^/]+$/.test(pathname))
    return [
      { label: "Сценарии", href: "/scenarios" },
      { label: "Репетиция" },
    ];
  if (/^\/scenarios\/[^/]+/.test(pathname))
    return [
      { label: "Сценарии", href: "/scenarios" },
      { label: t ?? "Сценарий" },
    ];
  if (/^\/assignments(\/|$)/.test(pathname))
    return [
      { label: "Назначения" },
      ...(pathname === "/assignments" ? [] : [{ label: t ?? "Назначение" }]),
    ];
  if (pathname === "/people") return [{ label: "Люди" }];
  if (/^\/people\/[^/]+/.test(pathname))
    return [
      { label: "Люди", href: "/people" },
      { label: t ?? "Сотрудник" },
    ];
  if (pathname === "/results") return [{ label: "Результаты" }];
  if (/^\/results\/[^/]+/.test(pathname))
    return [
      { label: "Результаты", href: "/results" },
      { label: t ?? "Сессия" },
    ];
  if (pathname === "/compare" || pathname === "/results/compare")
    return [
      { label: "Результаты", href: "/results" },
      { label: "Сравнение" },
    ];
  if (pathname === "/analytics") return [{ label: "Статистика" }];
  if (pathname === "/exports") return [{ label: "Выгрузки" }];
  if (pathname === "/analytics/exports")
    return [
      { label: "Статистика", href: "/analytics" },
      { label: "Выгрузки" },
    ];
  if (pathname === "/objections") return [{ label: "Возражения" }];
  const settings = /^\/settings(?:\/([^/]+))?/.exec(pathname);
  if (settings) {
    const sub = settings[1] ? (SETTINGS_LABEL[settings[1]] ?? null) : null;
    return [
      { label: "Настройки" },
      ...(sub ? [{ label: sub }] : []),
      ...(settings[1] && !sub ? [{ label: t ?? "Настройки" }] : []),
    ];
  }
  return [];
}

export function Breadcrumbs({ pathname }: { pathname: string }) {
  const searchParams = useSearchParams();
  const items = breadcrumbsFor(pathname, searchParams.get("title"));
  if (items.length === 0) return null;
  return (
    <nav aria-label="Хлебные крошки" className="flex items-center gap-1.5 text-13 min-w-0 max-w-[360px] truncate">
      {items.map((crumb, i) => {
        const last = i === items.length - 1;
        return (
          <span key={`${crumb.label}-${i}`} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && <span className="text-gray shrink-0">›</span>}
            {last || !crumb.href ? (
              <span className={cx("truncate", last ? "text-night font-medium" : "text-dusk")}>
                {crumb.label}
              </span>
            ) : (
              <Link href={crumb.href} className="text-dusk hover:underline truncate shrink-0">
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
