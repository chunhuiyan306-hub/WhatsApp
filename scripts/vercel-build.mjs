/**
 * Vercel build: map Neon env vars → DATABASE_URL, then migrate + next build.
 * Neon integration injects POSTGRES_URL / POSTGRES_PRISMA_URL, not DATABASE_URL.
 */
import { execSync } from "node:child_process";

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const fromNeon =
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL;
  if (fromNeon) {
    process.env.DATABASE_URL = fromNeon;
    console.log("[vercel-build] DATABASE_URL set from Neon integration env var.");
    return fromNeon;
  }
  return null;
}

const url = resolveDatabaseUrl();
if (!url) {
  console.error(`
[vercel-build] Missing DATABASE_URL.

Fix in Vercel Dashboard → Project "whats-app" → Settings → Environment Variables:

  Option A (recommended): Storage → Connect Database → Neon Postgres → link to this project
  Option B (manual): Add DATABASE_URL = your Neon postgres connection string
                     (Production + Preview + Development)

Then Redeploy from the latest Git commit (main).
`);
  process.exit(1);
}

console.log("[vercel-build] Running prisma migrate deploy...");
execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });

console.log("[vercel-build] Running next build...");
execSync("npm run build", { stdio: "inherit", env: process.env });
