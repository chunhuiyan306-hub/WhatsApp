import { detectLanguage } from "./detect-lang";

const PAIRS: Record<string, Record<string, string>> = {
  en: {
    "hello! can i get more info on this?": "你好！可以了解更多相关信息吗？",
    "can i get your latest catalog and pricing?":
      "能否提供最新产品目录和报价？",
    "good morning, kindly send catalog of your product in order to choose from.":
      "早上好，请发送产品画册以便选型。",
    "can you send me more details on the glass door models and the profiles and assembly of these":
      "能否发更多玻璃门型号、型材及组装的详细资料？",
    "can you please share more videos from your showroom":
      "能否分享更多展厅视频？",
    "are these samples for material": "这些是材料样品吗？",
  },
};

function dictTranslate(text: string, lang: string): string | null {
  const key = text.trim().toLowerCase();
  const table = PAIRS[lang] ?? PAIRS.en;
  for (const [k, v] of Object.entries(table)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}

/** 翻译成中文：词典优先，其次 MyMemory 免费 API */
export async function translateToZh(
  text: string,
  langHint?: string | null
): Promise<{ lang: string; zh: string }> {
  const trimmed = text?.trim() ?? "";
  if (!trimmed) return { lang: langHint ?? "en", zh: "" };

  const lang = langHint ?? detectLanguage(trimmed);
  if (lang === "zh") return { lang: "zh", zh: trimmed };

  const dict = dictTranslate(trimmed, lang);
  if (dict) return { lang, zh: dict };

  try {
    const pair = lang === "ar" ? "ar|zh-CN" : `${lang}|zh-CN`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed.slice(0, 450))}&langpair=${pair}`;
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      const json = (await res.json()) as {
        responseData?: { translatedText?: string };
      };
      const t = json.responseData?.translatedText;
      if (t && t.toUpperCase() !== trimmed.toUpperCase()) {
        return { lang, zh: t };
      }
    }
  } catch {
    /* 离线时保留原文 */
  }

  return { lang, zh: trimmed };
}
