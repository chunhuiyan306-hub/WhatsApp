"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

const navItems = [
  { href: "/", label: "概览" },
  { href: "/customers", label: "客户" },
  { href: "/drafts", label: "回复草稿" },
  { href: "/templates", label: "话术模板" },
  { href: "/assets", label: "资料库" },
  { href: "/automation", label: "自动化", adminOnly: true },
];

export function AppHeader({ isAdmin }: { isAdmin: boolean }) {
  const items = navItems.filter((i) => !i.adminOnly || isAdmin);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M12 2a10 10 0 0 0-8.7 14.9L2 22l5.3-1.4A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20Z" />
            </svg>
          </span>
          <span className="text-lg font-semibold text-slate-900">客户管理看板</span>
        </Link>
        <nav className="flex flex-1 items-center gap-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <UserButton afterSignOutUrl="/sign-in" />
      </div>
    </header>
  );
}
