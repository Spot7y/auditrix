"use client";

import Link from "next/link";

import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  BookOpen,
  Upload,
  BarChart3,
  FileText,
  Settings,
  AlertTriangle,
} from "lucide-react";

const menuItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },

  {
    label: "Audits",
    href: "/audits",
    icon: ShieldCheck,
  },

  {
  label: "Audit Queue",
  href: "/audit-queue",
  icon: Users,
},

  {
    label: "Curriculum",
    href: "/curriculum",
    icon: BookOpen,
  },

  {
    label: "Import",
    href: "/import",
    icon: Upload,
  },

  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },

  {
    label: "Reports",
    href: "/reports",
    icon: FileText,
  },

  {
  label: "INC Alerts",
  href: "/inc-alerts",
  icon: AlertTriangle,
  },

  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export default function Sidebar() {

  return (
    <aside
      className="
      hidden
      md:flex
      h-screen
      w-72
      flex-col
      border-r
      bg-slate-950
      text-white
      "
    >

      <div
        className="
        border-b
        px-6
        py-5
        "
      >

        <h1
          className="
          text-2xl
          font-bold
          tracking-tight
          "
        >
          Auditrix
        </h1>

        <p
          className="
          mt-1
          text-sm
          text-slate-400
          "
        >
          KSU CEIT Command Center
        </p>

      </div>

      <nav
        className="
        flex-1
        space-y-2
        p-4
        "
      >

        {menuItems.map((item) => {

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="
              flex
              items-center
              gap-3
              rounded-lg
              px-4
              py-3
              text-sm
              transition
              hover:bg-slate-800
              "
            >

              <Icon size={18} />

              {item.label}

            </Link>
          );
        })}

      </nav>

    </aside>
  );
}