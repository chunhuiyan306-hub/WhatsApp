import parsePhoneNumberFromString, {
  getCountryCallingCode,
  type CountryCode,
} from "libphonenumber-js/max";

// ISO 国家码 -> 中文国家名（覆盖常见外贸客户来源国，未命中时回退到 ISO 码）
const COUNTRY_ZH: Record<string, string> = {
  SA: "沙特阿拉伯",
  AE: "阿联酋",
  QA: "卡塔尔",
  KW: "科威特",
  OM: "阿曼",
  BH: "巴林",
  EG: "埃及",
  JO: "约旦",
  LB: "黎巴嫩",
  IQ: "伊拉克",
  SY: "叙利亚",
  YE: "也门",
  PS: "巴勒斯坦",
  TR: "土耳其",
  IR: "伊朗",
  IL: "以色列",
  US: "美国",
  GB: "英国",
  CA: "加拿大",
  AU: "澳大利亚",
  DE: "德国",
  FR: "法国",
  IT: "意大利",
  ES: "西班牙",
  NL: "荷兰",
  RU: "俄罗斯",
  IN: "印度",
  PK: "巴基斯坦",
  BD: "孟加拉国",
  ID: "印度尼西亚",
  MY: "马来西亚",
  SG: "新加坡",
  TH: "泰国",
  VN: "越南",
  PH: "菲律宾",
  JP: "日本",
  KR: "韩国",
  CN: "中国",
  HK: "中国香港",
  TW: "中国台湾",
  BR: "巴西",
  MX: "墨西哥",
  AR: "阿根廷",
  ZA: "南非",
  NG: "尼日利亚",
  KE: "肯尼亚",
  MA: "摩洛哥",
  DZ: "阿尔及利亚",
  TN: "突尼斯",
  LY: "利比亚",
  SD: "苏丹",
  ET: "埃塞俄比亚",
};

export interface PhoneInfo {
  e164: string | null; // 规范化号码 +966...
  countryCode: string | null; // ISO 码 SA
  callingCode: string | null; // 区号 966
  country: string | null; // 中文国家名
  valid: boolean;
}

export function countryNameZh(iso?: string | null): string | null {
  if (!iso) return null;
  return COUNTRY_ZH[iso.toUpperCase()] ?? iso.toUpperCase();
}

// 解析任意格式的电话号码，返回归属国与规范化结果
export function analyzePhone(input?: string | null): PhoneInfo {
  const empty: PhoneInfo = {
    e164: null,
    countryCode: null,
    callingCode: null,
    country: null,
    valid: false,
  };
  if (!input) return empty;

  const raw = input.trim();
  const normalized = raw.startsWith("+") ? raw : `+${raw.replace(/^00/, "")}`;
  const parsed = parsePhoneNumberFromString(normalized);
  if (!parsed) return { ...empty, e164: null };

  const iso = parsed.country ?? null;
  let callingCode: string | null = null;
  if (iso) {
    try {
      callingCode = getCountryCallingCode(iso as CountryCode);
    } catch {
      callingCode = parsed.countryCallingCode ?? null;
    }
  } else {
    callingCode = parsed.countryCallingCode ?? null;
  }

  return {
    e164: parsed.number ?? null,
    countryCode: iso,
    callingCode,
    country: countryNameZh(iso),
    valid: parsed.isValid(),
  };
}
