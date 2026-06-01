import Link from "next/link";
import { ClerkProvider } from "@clerk/nextjs";
import { isClerkEnabled, isAdminUser } from "@/lib/user-role";
import { AppHeader } from "@/components/AppHeader";
import "./globals.css";

export const metadata = {
  title: "WhatsApp 客户管理看板",
  description: "客户消息翻译、需求汇总、背景调查与回复草稿",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clerkOn = isClerkEnabled();
  const isAdmin = await isAdminUser();

  const body = (
    <div className="min-h-screen">
      {clerkOn ? (
        <AppHeader isAdmin={isAdmin} />
      ) : (
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
            <Link href="/" className="text-lg font-semibold text-slate-900">
              客户管理看板
            </Link>
            <span className="text-xs text-amber-600">本地模式（未配置 Clerk）</span>
          </div>
        </header>
      )}
      <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
    </div>
  );

  return (
    <html lang="zh-CN">
      <body>
        {clerkOn ? <ClerkProvider>{body}</ClerkProvider> : body}
      </body>
    </html>
  );
}
