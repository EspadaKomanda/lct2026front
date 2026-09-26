"use client";

import { Suspense, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/utils";
import { ROLE_LABEL } from "@/lib/labels";
import type { Me } from "@/lib/api/types";
import { Icon } from "@/components/icons";
import { Badge, ToastProvider } from "@/components/ui";
import { AuthProvider, useAuth } from "@/components/auth/auth-provider";
import { Breadcrumbs } from "@/components/auth/breadcrumbs";
import { navItemsFor, type NavLinkItem } from "@/components/auth/portal-nav";

const NAV_STORAGE_KEY = "arena-portal-nav-collapsed";
const NAV_WIDTH = 240;
const NAV_WIDTH_COLLAPSED = 64;

const navListeners = new Set<() => void>();

function readNavCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(NAV_STORAGE_KEY) === "1";
}

function writeNavCollapsed(collapsed: boolean): void {
  localStorage.setItem(NAV_STORAGE_KEY, collapsed ? "1" : "0");
  for (const listener of navListeners) listener();
}

function subscribeNav(onStoreChange: () => void): () => void {
  navListeners.add(onStoreChange);
  return () => {
    navListeners.delete(onStoreChange);
  };
}

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <Shell>{children}</Shell>
      </AuthProvider>
    </ToastProvider>
  );
}

function NavLink({ item, active, collapsed }: { item: NavLinkItem; active: boolean; collapsed: boolean }) {
  return (
    <Link
      href={item.href}
      title={item.label}
      aria-current={active ? "page" : undefined}
      className={cx(
        "relative h-10 rounded-field flex items-center gap-3 text-sm transition-colors duration-200",
        collapsed ? "justify-center px-0" : "px-3",
        active
          ? "bg-menu-active text-menu-text"
          : "text-menu-dim hover:text-menu-text hover:bg-white/[.06]",
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r bg-menu-bar" />
      )}
      <Icon name={item.icon} size={20} className="shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function UserMenu({ me }: { me: Me }) {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex flex-col items-end px-2 py-1 rounded-field hover:bg-frost transition-colors"
      >
        <span className="text-13 font-medium leading-tight">{me.user.full_name}</span>
        <span className="text-xs text-dusk leading-tight">{ROLE_LABEL[me.user.role]}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-surface border border-line rounded-card shadow-panel p-1 min-w-[200px] z-40">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              void logout();
            }}
            className="w-full h-9 px-3 rounded-field flex gap-2 items-center text-left text-sm text-danger hover:bg-danger-bg transition-colors"
          >
            <Icon name="logOut" size={16} className="shrink-0" />
            Выйти
          </button>
        </div>
      )}
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { me } = useAuth();
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribeNav, readNavCollapsed, () => false);

  const toggleNav = () => {
    writeNavCollapsed(!collapsed);
  };

  if (!me) return null;

  const navWidth = collapsed ? NAV_WIDTH_COLLAPSED : NAV_WIDTH;
  const items = navItemsFor(me.user.role);

  return (
    <div className="min-h-screen bg-bg">
      <aside
        className="fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-menu text-menu-text transition-[width] duration-200 overflow-hidden"
        style={{ width: navWidth }}
      >
        <div className="h-14 flex items-center px-4 shrink-0">
          <span className="text-base font-semibold whitespace-nowrap">Арена переговоров</span>
        </div>
        <nav className="flex-1 flex flex-col gap-1 p-3 overflow-y-auto overflow-x-hidden">
          {items.map((item) =>
            item.kind === "link" ? (
              <NavLink
                key={item.href}
                item={item}
                active={isActive(pathname, item.href)}
                collapsed={collapsed}
              />
            ) : (
              <div key={item.key} className="flex flex-col gap-1">
                {!collapsed && (
                  <div className="flex items-center gap-2 px-3 h-8 text-13 text-menu-dim whitespace-nowrap">
                    <Icon name={item.icon} size={14} className="shrink-0" />
                    {item.label}
                  </div>
                )}
                {item.children.map((child) => (
                  <NavLink
                    key={child.href}
                    item={child}
                    active={isActive(pathname, child.href)}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            ),
          )}
        </nav>
        <div className="p-3 shrink-0">
          <button
            type="button"
            onClick={toggleNav}
            title={collapsed ? "Развернуть меню" : "Свернуть меню"}
            aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
            className={cx(
              "w-full h-10 rounded-field flex items-center text-sm text-menu-dim transition-colors duration-200",
              "hover:text-menu-text hover:bg-white/[.06]",
              collapsed ? "justify-center px-0" : "px-3 gap-3",
            )}
          >
            <Icon name={collapsed ? "chevR" : "chevL"} size={20} className="shrink-0" />
            {!collapsed && <span className="truncate">Свернуть</span>}
          </button>
        </div>
      </aside>

      <header
        className="fixed top-0 right-0 h-14 z-30 bg-surface border-b border-line flex items-center gap-4 px-8 transition-[left] duration-200"
        style={{ left: navWidth }}
      >
        <Suspense fallback={null}>
          <Breadcrumbs pathname={pathname} />
        </Suspense>
        <div className="flex-1" />
        {me.demo_mode && <Badge variant="demo">Демо-режим включён</Badge>}
        <UserMenu me={me} />
      </header>

      <main
        className="min-h-screen pt-14 px-8 py-6 transition-[margin] duration-200"
        style={{ marginLeft: navWidth }}
      >
        {children}
      </main>
    </div>
  );
}
