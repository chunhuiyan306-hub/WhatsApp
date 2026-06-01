export interface AttachmentMeta {
  id: string;
  name: string;
  url: string;
  category: string;
}

export function parseAssetIds(json?: string | null): string[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json) as unknown;
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}

export function parseAttachments(json?: string | null): AttachmentMeta[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json) as AttachmentMeta[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
