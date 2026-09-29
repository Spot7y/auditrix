"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowRightLeft,
  BookOpen,
  FolderPlus,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  UserCog,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";
import { logout } from "../app/login/actions";
import type { CurrentStaff } from "../lib/queries/staff";

type NavItem = { href: string; label: string; icon: LucideIcon; roles?: CurrentStaff["role"][] };

const NAV: { heading?: string; items: NavItem[] }[] = [
  { items: [{ href: "/home", label: "Dashboard", icon: LayoutDashboard }] },
  {
    heading: "Students",
    items: [
      { href: "/students", label: "Students", icon: Search, roles: ["chairperson"] },
      { href: "/students/new", label: "Register Student", icon: UserPlus, roles: ["chairperson"] },
      { href: "/students/shift-in", label: "Shift In a Student", icon: ArrowRightLeft, roles: ["chairperson"] },
    ],
  },
  {
    heading: "Programs",
    items: [
      { href: "/curriculum", label: "Manage Curriculum", icon: BookOpen, roles: ["chairperson"] },
      { href: "/programs/new", label: "Create Program", icon: FolderPlus, roles: ["dean"] },
      { href: "/programs/reassign", label: "Reassign Chairperson", icon: UserCog, roles: ["dean"] },
    ],
  },
  { heading: "Account", items: [{ href: "/settings", label: "Account Settings", icon: Settings }] },
];

const ROLE_LABEL: Record<CurrentStaff["role"], string> = { chairperson: "Chairperson", dean: "Dean", admin: "Admin" };

function initials(name: string) {
  const parts = name.replace(/,/g, " ").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

/** The item whose href is the longest prefix of the current path is active. */
function activeHref(pathname: string, items: NavItem[]) {
  return items
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

export function Brand({ onDark = false }: { onDark?: boolean }) {
  return (
    <Link href="/home" className="flex items-center gap-2.5">
      <span
        className={`flex size-9 items-center justify-center rounded-lg ${onDark ? "bg-white/15 text-white" : "bg-brand-600 text-white"}`}
      >
        <GraduationCap className="size-5" aria-hidden />
      </span>
      <span className="leading-tight">
        <span className={`block text-base font-semibold tracking-tight ${onDark ? "text-white" : "text-ink-900"}`}>
          Auditrix
        </span>
        <span className={`block text-xs ${onDark ? "text-brand-100" : "text-ink-500"}`}>KSU</span>
      </span>
    </Link>
  );
}

function SidebarContent({ staff, onNavigate }: { staff: CurrentStaff; onNavigate?: () => void }) {
  const pathname = usePathname();
  const sections = NAV.map((s) => ({ ...s, items: s.items.filter((i) => !i.roles || i.roles.includes(staff.role)) })).filter(
    (s) => s.items.length > 0
  );
  const current = activeHref(pathname, sections.flatMap((s) => s.items));
  const scope = staff.program ?? staff.collegeName;

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5">
        <Brand />
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4" aria-label="Main">
        {sections.map((section, i) => (
          <div key={section.heading ?? i}>
            {section.heading && (
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-400">{section.heading}</p>
            )}
            <ul className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = href === current;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        active ? "bg-brand-50 text-brand-800" : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
                      }`}
                    >
                      <Icon className={`size-4.5 shrink-0 ${active ? "text-brand-600" : "text-ink-400"}`} aria-hidden />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800">
            {initials(staff.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink-900">{staff.name}</p>
            <p className="truncate text-xs text-ink-500">
              {ROLE_LABEL[staff.role]}
              {scope ? ` · ${scope}` : ""}
            </p>
          </div>
        </div>
        <form action={logout} className="mt-1">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-red-50 hover:text-status-violation"
          >
            <LogOut className="size-4.5 shrink-0" aria-hidden />
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AppShell({ staff, children }: { staff: CurrentStaff; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  // Stop the page behind the phone menu from scrolling. (Links in the menu close it themselves.)
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-white lg:block">
        <SidebarContent staff={staff} />
      </aside>

      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-white/90 px-4 backdrop-blur lg:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="rounded-lg p-2 text-ink-600 hover:bg-ink-100"
        >
          <Menu className="size-5" aria-hidden />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] animate-toast-in bg-white shadow-overlay">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-5 rounded-lg p-1.5 text-ink-500 hover:bg-ink-100"
            >
              <X className="size-5" aria-hidden />
            </button>
            <SidebarContent staff={staff} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
