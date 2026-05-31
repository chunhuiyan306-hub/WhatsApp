/** 简易语言检测 */
export function detectLanguage(text: string): string {
  if (!text?.trim()) return "en";
  if (/[\u4e00-\u9fff]/.test(text)) return "zh";
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  if (/[\u0E00-\u0E7F]/.test(text)) return "th";
  return "en";
}

export function isRtlLang(lang?: string | null): boolean {
  return lang === "ar" || lang === "he" || lang === "fa";
}
