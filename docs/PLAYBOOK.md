# Agent 操作手册（Playbook）

本手册定义自动化工作流。系统默认 **全自动**：WhatsApp 扫描 → ingest → 翻译 → 分类 → 标签 → 背景调查 → 草稿。

看板地址：`http://localhost:3000` · 自动化页：`/automation`

---

## 全自动架构

```mermaid
flowchart LR
  W[Worker: npm run auto] -->|Playwright| WA[WhatsApp Web]
  WA -->|POST /api/ingest| P[Pipeline 流水线]
  P --> T[翻译]
  P --> C[分类+标签]
  P --> E[背景调查]
  P --> D[回复草稿 pending]
  D --> U[你在看板编辑/确认]
  U --> A[Agent 发送 approved 草稿]
```

### 启动方式

1. **看板**：`npm run dev` → http://localhost:3000
2. **每日定点扫 WhatsApp**：`npm run auto`（默认 **10:00、15:00** 本地时间；看板 `/automation` 可改）
3. **单次扫描**：`npm run auto:scan-once`
4. **仅重跑流水线**（不扫 WA）：看板 `/automation` →「立即跑一遍全流程」或 `npm run pipeline:all`

---

## Pipeline 自动规则（ingest 后默认执行）

| 步骤 | 说明 |
|------|------|
| 翻译 | 词典 + MyMemory API → 写入 `translatedZh` |
| 分类 | catalog / project / quote / other（关键词） |
| 标签 | 国家、意向、来源、待同步等 |
| 背景 | 已知资料库 + 行业推断，`verified=false` |
| 草稿 | 按语言模板生成 `pending`（跳过内部/同行/未同步/餐饮误点） |

传 `auto: false` 可跳过 Pipeline（仅 raw ingest）。

---

## ingest 扩展字段

```json
{
  "auto": true,
  "waProfileName": "~Lora Bergiy",
  "isBusinessAccount": false,
  "businessName": null,
  "sourceHint": "instagram",
  "customer": { "phone": "+971509464300", "waChatId": "+971 50 946 4300" },
  "messages": [{ "direction": "in", "originalText": "..." }]
}
```

---

## 人工环节（安全保留）

- **草稿发送**：默认不自动发消息；你在看板确认 `approved` 后，对我说「把已确认的草稿发出去」。
- **背景核实**：看板点「标记已核实」。
- **WhatsApp 标签回写**：确认后我点 WA label 并 PATCH `syncedToWa`。

---

## 接口速查

| 方法 | 路径 | 用途 |
|------|------|------|
| POST | `/api/ingest` | 写入 + 自动 Pipeline |
| POST | `/api/pipeline/run` | `{ "all": true }` 或 `{ "customerId": "..." }` |
| GET/PATCH/POST | `/api/automation` | 状态 / 开关 / 触发 pipeline-all |
| PATCH | `/api/drafts/{id}` | 编辑草稿 / 改状态 |

---

## 常用指令（对话触发，等价于 Worker）

- 「扫一遍新消息」→ 等同 `auto:scan-once`
- 「跑一遍全流程」→ pipeline-all
- 「把已确认的发出去」→ 发送 approved 草稿
