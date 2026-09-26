import type { Role } from "@/lib/api/types";
import type { IconName } from "@/components/icons";

const ALL_ROLES: Role[] = ["methodologist", "observer", "admin"];

export interface NavLinkItem {
  kind: "link";
  href: string;
  label: string;
  icon: IconName;
  roles: Role[];
}

export interface NavGroupItem {
  kind: "group";
  key: string;
  label: string;
  icon: IconName;
  children: NavLinkItem[];
}

export type NavItem = NavLinkItem | NavGroupItem;

export const NAV_ITEMS: NavItem[] = [
  { kind: "link", href: "/scenarios", label: "Сценарии", icon: "book", roles: ["methodologist", "admin"] },
  { kind: "link", href: "/assignments", label: "Назначения", icon: "clip", roles: ALL_ROLES },
  { kind: "link", href: "/results", label: "Результаты", icon: "bars", roles: ALL_ROLES },
  { kind: "link", href: "/people", label: "Люди", icon: "users", roles: ALL_ROLES },
  { kind: "link", href: "/analytics", label: "Статистика", icon: "trend", roles: ALL_ROLES },
  { kind: "link", href: "/exports", label: "Выгрузки", icon: "dl", roles: ALL_ROLES },
  { kind: "link", href: "/objections", label: "Возражения", icon: "msg", roles: ALL_ROLES },
  {
    kind: "group",
    key: "settings",
    label: "Настройки",
    icon: "sliders",
    children: [
      { kind: "link", href: "/settings/profiles", label: "Профили тренажёра", icon: "cpu", roles: ALL_ROLES },
      { kind: "link", href: "/settings/access", label: "Доступ", icon: "key", roles: ["admin"] },
      { kind: "link", href: "/settings/audit", label: "Журнал", icon: "fileCheck", roles: ["admin"] },
      { kind: "link", href: "/settings/portal", label: "Портал", icon: "sliders", roles: ["admin"] },
    ],
  },
];

export function linkVisible(item: NavLinkItem, role: Role): boolean {
  return item.roles.includes(role);
}

export function navItemsFor(role: Role): NavItem[] {
  const result: NavItem[] = [];
  for (const item of NAV_ITEMS) {
    if (item.kind === "link") {
      if (linkVisible(item, role)) result.push(item);
      continue;
    }
    const children = item.children.filter((c) => linkVisible(c, role));
    if (children.length > 0) result.push({ ...item, children });
  }
  return result;
}

/** Первый доступный пункт меню — стартовый экран после входа. */
export function firstAvailablePath(role: Role): string {
  for (const item of NAV_ITEMS) {
    if (item.kind === "link") {
      if (linkVisible(item, role)) return item.href;
      continue;
    }
    const child = item.children.find((c) => linkVisible(c, role));
    if (child) return child.href;
  }
  return "/assignments";
}
