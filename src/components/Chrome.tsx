"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import type { Role } from "@/lib/types";

const INTERN_NAV = [
  { href: "/today", label: "Today" },
  { href: "/log", label: "Work log" },
  { href: "/tasks", label: "Tasks" },
  { href: "/leave", label: "Leave" },
];

const STAFF_NAV = [
  { href: "/admin", label: "Today" },
  { href: "/admin/sheet", label: "Attendance" },
  { href: "/admin/approvals", label: "People" },
  { href: "/admin/settings", label: "Settings" },
];

export function TopBar({ name, role }: { name: string; role: Role }) {
  const path = usePathname();
  const staff = role === "admin" || role === "superuser";
  const nav = staff ? [...STAFF_NAV] : INTERN_NAV;
  if (role === "superuser") nav.push({ href: "/super", label: "Accounts" });

  return (
    <div className="topbar">
      <div className="inner">
        <Link href={staff ? "/admin" : "/today"} className="mark">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/agthia-logo.png" alt="Agthia" width={82} height={54} />
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

        <AccountMenu name={name} role={role} />
      </div>
    </div>
  );
}

/** Name, role, and the way out. Every role gets one. */
function AccountMenu({ name, role }: { name: string; role: Role }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  return (
    <div className="account">
      <span className="who">
        <b>{name}</b>
        <span>{roleLabel(role)}</span>
      </span>
      <button
        className="signout"
        disabled={leaving}
        onClick={async () => {
          setLeaving(true);
          await fetch("/api/auth/logout", { method: "POST" });
          router.replace("/login");
          router.refresh();
        }}
      >
        {leaving ? "Signing out" : "Sign out"}
      </button>
    </div>
  );
}

/** /admin must not light up while you are on /admin/settings. */
function isHere(path: string, href: string): boolean {
  if (href === "/admin") return path === "/admin";
  return path === href || path.startsWith(href + "/");
}

function roleLabel(role: Role): string {
  if (role === "superuser") return "Administrator";
  if (role === "admin") return "Supervisor";
  if (role === "intern") return "Intern";
  return "Awaiting approval";
}
