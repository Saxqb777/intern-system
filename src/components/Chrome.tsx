"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/types";

const INTERN_NAV = [
  { href: "/today", label: "Today" },
  { href: "/log", label: "Work log" },
  { href: "/tasks", label: "Tasks" },
  { href: "/leave", label: "Leave" },
];

const STAFF_NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/approvals", label: "Approvals" },
  { href: "/admin/sheet", label: "Attendance" },
  { href: "/admin/settings", label: "Settings" },
];

export function TopBar({
  name,
  role,
  testMode,
}: {
  name: string;
  role: Role;
  testMode: boolean;
}) {
  const path = usePathname();
  const staff = role === "admin" || role === "superuser";
  const nav = staff ? [...STAFF_NAV] : INTERN_NAV;
  if (role === "superuser") nav.push({ href: "/super", label: "System" });

  return (
    <>
      {testMode && (
        <div className="testbar">
          Test mode &middot; nothing here is real attendance
        </div>
      )}
      <div className="topbar">
        <div className="inner">
          <Link href={staff ? "/admin" : "/today"} className="mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/agthia-logo.png" alt="Agthia" width={86} height={57} />
          </Link>

          <nav className="navlinks">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isHere(path, item.href) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="who">
            <b>{name}</b>
            <span>{roleLabel(role)}</span>
          </div>
        </div>
      </div>
    </>
  );
}

/** /admin must not light up while you are on /admin/settings. */
function isHere(path: string, href: string): boolean {
  if (href === "/admin") return path === "/admin";
  return path === href || path.startsWith(href + "/");
}

function roleLabel(role: Role): string {
  if (role === "superuser") return "System owner";
  if (role === "admin") return "Supervisor";
  if (role === "intern") return "Intern";
  return "Waiting for approval";
}
