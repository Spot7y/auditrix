"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowRightLeft,
  BookOpen,
  CalendarDays,
  FolderPlus,
  GraduationCap,
  History,
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
import IdleLogout from "./IdleLogout";
import StudentSearchBar from "./StudentSearchBar";
import type { CurrentStaff } from "../lib/queries/staff";
import { describeTerm } from "../lib/domain/Term";

type NavItem = { href: string; label: string; icon: LucideIcon; roles?: CurrentStaff["role"][] };

const NAV: { heading?: string; items: NavItem[] }[] = [
  { items: [{ href: "/home", label: "Dashboard", icon: LayoutDashboard }] },
  {
    heading: "Students",
    items: [
      { href: "/students", label: "Students", icon: Search, roles: ["chairperson"] },
      { href: "/students/new", label: "Register Student", icon: UserPlus, roles: ["chairperson"] },
      { href: "/students/shift-in", label: "Shift In a Student", icon: ArrowRightLeft, roles: ["chairperson"] },
      { href: "/movements", label: "Student Movements", icon: History, roles: ["chairperson", "dean"] },
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
        className={`flex size-9 items-center justify-center rounded-lg ${onDark ? "bg-white/15 text-white" : "bg-brand-800 text-white"}`}
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

/** The college's current semester, as set by the dean. */
function TermPill({ term }: { term: string | null }) {
  return term ? (
    <span
      title="Current semester, set by the dean"
      className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-800 ring-1 ring-inset ring-brand-600/20"
    >
      <CalendarDays className="size-3.5 shrink-0" aria-hidden />
      {describeTerm(term)}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/25">
      <CalendarDays className="size-3.5 shrink-0" aria-hidden />
      Semester not set
    </span>
  );
}

function SidebarContent({
  staff,
  term,
  badges,
  onNavigate,
}: {
  staff: CurrentStaff;
  term: string | null;
  badges: Record<string, number>;
  onNavigate?: () => void;
}) {
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
        {/* On phones the top bar has no room for the semester, so the menu shows it. */}
        {onNavigate && (
          <div className="mt-4">
            <TermPill term={term} />
          </div>
        )}
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
                const badge = badges[href];
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        active ? "bg-brand-800 text-white shadow-sm" : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
                      }`}
                    >
                      <Icon className={`size-4.5 shrink-0 ${active ? "text-brand-100" : "text-ink-400"}`} aria-hidden />
                      <span className="flex-1">{label}</span>
                      {badge !== undefined && (
                        <span
                          className={`tabular rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            active ? "bg-white/15 text-white" : "bg-ink-100 text-ink-600"
                          }`}
                        >
                          {badge}
                        </span>
                      )}
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

export default function AppShell({
  staff,
  term,
  badges,
  children,
}: {
  staff: CurrentStaff;
  /** The college's current semester, e.g. "26-1", or null if the dean hasn't set it. */
  term: string | null;
  /** Counts shown next to sidebar links, by href. */
  badges: Record<string, number>;
  children: ReactNode;
}) {
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
      <IdleLogout />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-white lg:block">
        <SidebarContent staff={staff} term={term} badges={badges} />
      </aside>

      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-10">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="-ml-2 rounded-lg p-2 text-ink-600 hover:bg-ink-100 lg:hidden"
        >
          <Menu className="size-5" aria-hidden />
        </button>
        <div className="min-w-0 flex-1 sm:max-w-md">
          <StudentSearchBar placeholder="Search students by ID or name…" shortcut />
        </div>
        <div className="ml-auto hidden shrink-0 sm:block">
          <TermPill term={term} />
        </div>
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
            <SidebarContent staff={staff} term={term} badges={badges} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
