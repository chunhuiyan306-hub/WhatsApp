# 部署到 GitHub + Vercel（团队共享看板）

同事通过 **Clerk 登录**访问线上看板；WhatsApp 扫描在你本机运行（`npm run hub`）。

## 快速清单

### 1. GitHub

```bash
git add .
git commit -m "feat: cloud team deployment with Postgres, Clerk, ingest secret"
git push origin main
```

### 2. Vercel 资源

1. [vercel.com](https://vercel.com) → Import → `chunhuiyan306-hub/WhatsApp`
2. **Storage → Neon Postgres** → 关联项目
3. **Storage → Blob** → 创建并关联
4. **Integrations → Clerk** → 安装并关联项目
5. 环境变量确认：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | Neon 连接串（或 `POSTGRES_URL`，构建脚本会自动映射） |
| `BLOB_READ_WRITE_TOKEN` | Blob 上传 PDF |
| `INGEST_SECRET` | 扫描机密钥（随机长串，与 `.env.scanner` 一致） |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk 自动注入 |
| `CLERK_SECRET_KEY` | Clerk 自动注入 |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |

6. Redeploy 直到构建成功

构建命令（[vercel.json](vercel.json)）：`node scripts/vercel-build.mjs`

### 3. Clerk 角色

Clerk Dashboard → Users → 你的账号 → Public metadata:

```json
{ "role": "admin" }
```

同事邀请后默认 `sales`（无 metadata 即为 sales）。

### 4. 本机扫描机

复制 [.env.scanner.example](.env.scanner.example) 为 `.env.scanner`：

```env
HUB_URL=https://你的项目.vercel.app
INGEST_SECRET=与 Vercel 相同
```

运行（加载扫描机 env）：

```powershell
Get-Content .env.scanner | ForEach-Object { if ($_ -match '^([^#=]+)=(.*)$') { [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process') } }
npm run hub
```

### 5. 迁移本地 SQLite 数据（可选）

Neon 空库 migrate deploy 后：

```bash
DATABASE_URL="postgresql://..." npm run migrate:sqlite-to-pg
```

---

## 本地 vs 线上

| 功能 | 本机扫描机 | Vercel 线上 |
|------|-----------|-------------|
| 看板 / 客户 / 草稿 | 通过 HUB_URL | 同事 Clerk 登录 |
| WhatsApp 扫描 | Chrome + hub | 不支持 |
| 数据库 | 写入 Neon | Neon 共享 |
| PDF | Blob | Blob |

详见 [CLOUD-PLAN.md](CLOUD-PLAN.md)
