/**
 * 扫描机 / Worker 鉴权：Authorization: Bearer INGEST_SECRET
 * 生产环境必须配置；本地未配置时放行（方便开发）
 */
export function isIngestSecretConfigured(): boolean {
  return Boolean(process.env.INGEST_SECRET?.trim());
}

export function verifyScannerRequest(req: Request): boolean {
  const secret = process.env.INGEST_SECRET?.trim();
  if (!secret) return true;

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  return token.length > 0 && token === secret;
}

export function scannerAuthHeaders(): Record<string, string> {
  const secret = process.env.INGEST_SECRET?.trim();
  if (!secret) return {};
  return { Authorization: `Bearer ${secret}` };
}

export function scannerAuthFail() {
  return new Response(
    JSON.stringify({ ok: false, error: "需要有效的 INGEST_SECRET" }),
    { status: 403, headers: { "Content-Type": "application/json" } }
  );
}
