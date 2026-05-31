# 部署到 GitHub + Vercel（团队共享看板）

同事访问线上看板；WhatsApp 自动扫描仍在你本机运行（`npm run auto`）。

## 1. 推送到 GitHub

```bash
git init
git add .
git commit -m "Initial commit: WhatsApp customer hub"
git branch -M main
git remote add origin https://github.com/你的用户名/whatsapp-customer-hub.git
git push -u origin main
```

`.gitignore` 已排除：`.env`、`*.db`、`.wa-browser-data/`、`public/uploads/*`

## 2. Vercel 部署

1. 打开 [vercel.com](https://vercel.com) → Import Git Repository → 选你的 GitHub 仓库
2. Framework Preset：**Next.js**（自动识别）
3. 添加 **Postgres 数据库**（推荐 Neon，Vercel Marketplace 一键添加）
4. 添加 **Blob 存储**（上传 PDF 画册用，Vercel Dashboard → Storage → Blob）
5. 环境变量：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | Neon Postgres 连接串（Vercel 集成后自动注入） |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob Token（集成后自动注入） |

6. **重要**：仓库已使用 **PostgreSQL**。在 Vercel 添加 **Neon Postgres** 后，`DATABASE_URL` 会自动注入；未配置数据库时构建会在 `prisma migrate deploy` 阶段失败。

7. Build Command（Vercel 项目设置，`vercel.json` 已配置）：

```bash
npx prisma migrate deploy && npm run build
```

8. Deploy 完成后，在 Vercel 终端或本地对生产库执行一次 seed（可选）：

```bash
DATABASE_URL="postgres://..." npx tsx prisma/seed.ts
```

## 3. 本地 vs 线上

| 功能 | 本地 | Vercel 线上 |
|------|------|-------------|
| 看板 / 客户 / 草稿 | ✅ | ✅ 同事可访问 |
| 话术模板 / 资料库 | ✅ | ✅ 共享 |
| PDF 存储 | `public/uploads/` | Vercel Blob |
| WhatsApp 自动扫描 | `npm run auto` | ❌ 需本机 Worker |
| 数据库 | Postgres（Neon 或本地） | Postgres（团队共享） |

## 4. 本机 Worker 连线上看板

若希望扫描结果写入**线上**数据库而非本地：

```bash
# .env.local（Worker 用）
HUB_URL=https://你的项目.vercel.app
```

然后本机运行 `npm run auto`，ingest 会打到线上 API。

## 5. 话术 + PDF 工作流

1. **资料库** `/assets`：上传产品画册 PDF
2. **话术模板** `/templates`：写「要画册」「询价」等专属话术，勾选要附带的 PDF
3. 自动扫描 / Pipeline 生成草稿时会用你的模板 + 绑定 PDF
4. **回复草稿** `/drafts`：编辑 → 确认 → 对我说「发出去」（本机 WhatsApp 发送）
