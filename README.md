# WhatsApp 客户管理与自动化看板

一个本地网页看板，作为客户数据中枢；配合 Cursor 的 MCP 浏览器自动化操作
WhatsApp Business Web，实现客户消息抓取、**翻译成中文**、需求汇总、背景调查、
打标签，以及「AI 起草 + 你确认后发送」的回复流程。

## 能做什么

- **接收与翻译**：抓取客户消息（英语/阿拉伯语等任意语言），统一翻译成中文，原文与译文对照展示（支持阿拉伯语 RTL）。
- **客户汇总台账**：记录有多少客人、各自需求（要画册 / 带项目 / 询价 / 其它），可按国家、需求、标签、状态筛选搜索。
- **背景调查**：电话号码自动判断归属国；姓名/号码联网检索 LinkedIn 与公开资料（标注「待人工确认」）。
- **标签**：与 WhatsApp Business label 对应，确认后回写到 WhatsApp，并标记同步状态。
- **回复草稿**：生成客人语言版 + 中文对照草稿，你在看板确认后由我发送。

## 技术栈

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Prisma + SQLite（本地零配置）
- libphonenumber-js（电话号码 → 归属国）

## 快速开始

> 需要本机已安装 Node.js 18+。

```bash
# 1. 安装依赖（会自动执行 prisma generate）
npm install

# 2. 创建数据库与表
npx prisma migrate dev --name init

# 3.（可选）写入示例数据，便于先看效果
npm run seed

# 4. 启动看板
npm run dev
```

打开 http://localhost:3000

## 页面

- `/` 概览：累计客户、今日新客、待确认回复、需求/国家/状态分布。
- `/customers` 客户：列表 + 筛选搜索；点进详情看聊天时间线、需求、标签、背景资料、备注、草稿。
- `/drafts` 回复草稿：待确认队列，**可编辑** / 确认 / 否决 / 标记已发送。
- `/templates` **话术模板**：按要画册/询价/带项目设置专属回复，可绑定 PDF。
- `/assets` **资料库**：上传 PDF 画册、报价单，生成草稿时自动附带。
- `/automation` 自动化：Worker 开关、每日 10:00/15:00 扫描计划。

## 全自动工作流

```bash
# 终端 1：看板
npm run dev

# 终端 2：每日定点扫 WhatsApp（默认 **10:00、15:00** 本地时间，各一次）
npm run auto

# 或单次扫描
npm run auto:scan-once

# 仅对已有客户重跑：翻译→分类→标签→背景→补草稿
npm run pipeline:all
```

每次 `ingest` 默认触发 Pipeline（传 `auto: false` 可关闭）。详见 [docs/PLAYBOOK.md](docs/PLAYBOOK.md)。

## 部署给同事（GitHub + Vercel）

完整步骤见 [docs/DEPLOY.md](docs/DEPLOY.md)。概要：

1. 推送到 GitHub
2. Vercel Import 项目，添加 **Neon Postgres** + **Blob** 存储
3. 将 `prisma/schema.prisma` 的 `provider` 改为 `postgresql` 后部署
4. 本机 `npm run auto` 仍负责 WhatsApp 扫描；设置 `HUB_URL=https://你的.vercel.app` 可写入线上数据库

## 我（Agent）怎么帮你操作

完整步骤见 [docs/PLAYBOOK.md](docs/PLAYBOOK.md)。常用指令：

- 「扫一遍 WhatsApp 新消息，翻译并汇总」
- 「给某客户起草回复，问他数量和交期」
- 「把所有已确认的草稿发出去」
- 「给沙特、要画册的客户打『高意向』标签」
- 「查一下这个号码是哪个国家、能不能搜到资料」

## 重要前提与边界

- WhatsApp Web 首次需你手机扫码登录；掉线需重新扫码。
- 标签功能仅 WhatsApp **Business** 账号可用。
- 「主动回复」默认是 **AI 起草 + 你确认后发送**，不会未经确认就发消息。
- 背景调查只用公开信息，准确率有限，统一走「辅助检索 + 人工确认」。
- **全自动**：Worker 定时扫未读 + ingest 后自动跑 Pipeline；**发消息**仍需你在看板确认。

## 数据库管理

```bash
npm run db:studio   # 用 Prisma Studio 可视化查看/编辑数据
```

数据库文件 `prisma/dev.db` 不纳入版本管理（见 .gitignore）。
