import { auth, currentUser } from "@clerk/nextjs/server";

export type UserRole = "admin" | "sales";

export function isClerkEnabled(): boolean {
  return Boolean(
    process.env.CLERK_SECRET_KEY?.trim() &&
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()
  );
}

export function getRoleFromMetadata(
  metadata: Record<string, unknown> | undefined | null
): UserRole {
  const role = metadata?.role;
  return role === "admin" ? "admin" : "sales";
}

/** API 路由：要求登录；adminOnly 时仅管理员 */
export async function requireApiUser(options?: {
  adminOnly?: boolean;
}): Promise<
  | { ok: true; userId: string; role: UserRole }
  | { ok: false; status: number; error: string }
> {
  if (!isClerkEnabled()) {
    return { ok: true, userId: "dev-local", role: "admin" };
  }

  const { userId } = await auth();
  if (!userId) {
    return { ok: false, status: 401, error: "请先登录" };
  }

  const user = await currentUser();
  const role = getRoleFromMetadata(
    user?.publicMetadata as Record<string, unknown>
  );

  if (options?.adminOnly && role !== "admin") {
    return { ok: false, status: 403, error: "需要管理员权限" };
  }

  return { ok: true, userId, role };
}

/** 页面组件：是否管理员 */
export async function isAdminUser(): Promise<boolean {
  if (!isClerkEnabled()) return true;
  const user = await currentUser();
  if (!user) return false;
  return getRoleFromMetadata(user.publicMetadata as Record<string, unknown>) === "admin";
}
