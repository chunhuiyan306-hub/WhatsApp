const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const LINKEDIN_RE =
  /https?:\/\/(?:[\w-]+\.)?linkedin\.com\/(?:in|company)\/[a-zA-Z0-9_%\-./]+/gi;

function decodeDdgRedirects(html: string): string[] {
  const urls: string[] = [];
  const uddgRe = /uddg=([^&"']+)/gi;
  let m: RegExpExecArray | null;
  while ((m = uddgRe.exec(html)) !== null) {
    try {
      urls.push(decodeURIComponent(m[1]));
    } catch {
      /* ignore */
    }
  }
  return urls;
}

/** 用 DuckDuckGo 公开检索 LinkedIn 个人/公司页（无需 API Key） */
export async function searchLinkedInUrls(query: string): Promise<string[]> {
  const q = encodeURIComponent(`${query.trim()} site:linkedin.com`);
  const res = await fetch(`https://html.duckduckgo.com/html/?q=${q}`, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return [];

  const html = await res.text();
  const found = new Set<string>();

  for (const raw of [...html.matchAll(LINKEDIN_RE)].map((x) => x[0])) {
    const clean = raw.replace(/&amp;/g, "&").split(/[<"']/)[0];
    if (clean.includes("linkedin.com")) found.add(clean);
  }

  for (const decoded of decodeDdgRedirects(html)) {
    for (const raw of decoded.match(LINKEDIN_RE) ?? []) {
      found.add(raw.split(/[<"']/)[0]);
    }
  }

  return [...found].slice(0, 5);
}

export function buildSearchQuery(input: {
  name?: string | null;
  country?: string | null;
  companyName?: string | null;
  phone?: string | null;
}): string | null {
  const name = (input.name ?? "").replace(/^~/, "").trim();
  const parts: string[] = [];

  if (name && !/^\+?\d[\d\s-]{6,}$/.test(name)) parts.push(name);
  if (input.companyName?.trim()) parts.push(input.companyName.trim());
  if (input.country?.trim() && input.country !== "未知") parts.push(input.country);

  if (parts.length === 0) return null;
  return parts.join(" ");
}
