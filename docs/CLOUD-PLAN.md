# 云端团队版 · 实施计划

> 目标：同事通过浏览器共用一份客户数据；WhatsApp 扫描仍由已登录设备执行；数据存 Neon Postgres + Vercel Blob。

---

## 一、架构总览

```
                    ┌─────────────────────────────────────┐
                    │  Vercel（云端 · 全员访问）            │
                    │  • Next.js 看板 + REST API           │
                    │  • Neon Postgres（唯一数据源）        │
                    │  • Vercel Blob（PDF 画册）           │
                    │  • Clerk 登录（同事账号）             │
                    └───────────────▲─────────────────────┘
                                    │ HTTPS + 密钥
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
   同事浏览器              扫描机（你或 VPS）           管理员
   看客户/草稿/模板        npm run hub                  Vercel/Neon 控制台
   不可扫 WhatsApp         HUB_URL=线上地址
                          Chrome 已登录 WA
```

**原则：** 看板与数据上云；扫描不上云（Meta / Playwright 限制）。

---

## 二、分阶段路线（推荐顺序）

### 阶段 0 · 现状对齐（0.5 天）

| 项 | 现状 | 目标 |
|----|------|------|
| 数据库 | SQLite 本地 `dev.db` | Postgres（Neon） |
| 迁移文件 | `migration_lock.toml` = sqlite | 新建 Postgres 迁移链 |
| 部署文档 | `DEPLOY.md` 写 Postgres | 与代码一致 |
| 鉴权 | 无，API 全开放 | 必须补（阶段 2 前至少 ingest 密钥） |
| GitHub | 已有 `chunhuiyan306-hub/WhatsApp` | 整理未提交改动后 push |

**产出：** 技术债清单确认，本地功能冻结一小段时间用于迁移。

---

### 阶段 1 · 云端最小可用 MVP（2–3 天）

**目标：** 线上看板能打开，数据库在 Neon，本机扫描能写入线上。

#### 1.1 数据库 Postgres 化

1. `schema.prisma` → `provider = "postgresql"`
2. 新建 Postgres 专用 migration（或 `prisma db push` 到 Neon 开发库验证）
3. 更新 `vercel-build.mjs`（已有 Neon env 映射，保留）
4. 本地开发：`.env` 用 Neon **分支库**（dev branch），避免污染生产

#### 1.2 Vercel + Neon + Blob

1. Vercel Import GitHub 仓库
2. Storage → Connect **Neon Postgres** → 关联项目
3. Storage → Create **Blob** → 注入 `BLOB_READ_WRITE_TOKEN`
4. 确认 `DATABASE_URL` 存在 → Redeploy
5. 生产库执行 `prisma migrate deploy`（构建已含）
6. （可选）`seed:templates` 初始化话术，**不要** seed 假客户

#### 1.3 扫描机连线上

扫描机 `.env`（与云端分离）：

```env
HUB_URL=https://你的项目.vercel.app
INGEST_SECRET=（阶段 1 临时随机串，阶段 2 与 Clerk 并存）
```

运行：

```bash
npm run hub
```

验证：扫 1 个会话 → 同事浏览器刷新 `/customers` 能看到。

#### 1.4 阶段 1 验收标准

- [ ] Vercel 构建绿
- [ ] `/customers` 线上可访问（此阶段可暂不加登录，**仅内测 URL 保密**）
- [ ] 本机扫描写入线上库
- [ ] PDF 上传走 Blob，链接可打开
- [ ] 自动化日志 `/automation` 线上可见

**阶段 1 风险：** API 无登录时 URL 泄露 = 数据裸奔 → 阶段 2 必须紧接。

---

### 阶段 2 · 团队登录与权限（2 天）

**目标：** 只有公司同事能看；扫描接口防伪造。

#### 2.1 登录方案（推荐 Clerk）

| 方案 | 优点 | 缺点 |
|------|------|------|
| **Clerk**（推荐） | Vercel 集成快、中文团队够用 | 免费 MAU 有限 |
| Auth0 | 企业功能多 | 配置重 |
| NextAuth 自建 | 无 vendor 锁定 | 开发时间长 |

**推荐 Clerk：** Marketplace 一键 + Next.js App Router 中间件。

#### 2.2 权限模型（v1 简单够用）

| 角色 | 能做什么 |
|------|----------|
| **admin**（你） | 全部 + 自动化页 + 删客户 |
| **sales**（同事） | 客户/草稿/模板/资料库 读写，无自动化 |
| **scanner**（机器） | 仅 `POST /api/ingest` + `PATCH /api/automation`（密钥） |

实现：Clerk `publicMetadata.role` + API route 校验。

#### 2.3 Ingest 安全（必做）

```env
# Vercel + 扫描机
INGEST_SECRET=长随机串
```

- `POST /api/ingest` 要求 Header `Authorization: Bearer <INGEST_SECRET>`
- `wa-auto-scan.mjs` / `hub.mjs` 读取 env 带上

#### 2.4 阶段 2 验收

- [ ] 未登录访问 `/customers` → 跳转登录
- [ ] 同事账号登录后可看客户
- [ ] 无密钥 curl ingest → 403
- [ ] 扫描机带密钥 ingest → 200

---

### 阶段 3 · 数据迁移与协作上线（1–2 天）

#### 3.1 本地 SQLite → Neon 一次性迁移

1. 导出本地：`sqlite3 prisma/dev.db .dump` 或 Prisma 脚本读 SQLite
2. 转换写入 Neon（客户、消息、草稿、标签、enrichment）
3. 核对数量：客户数、消息数、今日扫描的客户是否在列
4. **删除 seed 假数据**（已有 `purge:seed`）

#### 3.2 同事 onboarding（5 分钟/人）

1. 发邀请链接（Clerk）
2. 浏览器收藏：`https://xxx.vercel.app/customers`
3. 说明：**不要**点自动化扫描；看草稿在 `/drafts`

#### 3.3 扫描机 SOP（写进 `docs/PLAYBOOK.md`）

| 事项 | 说明 |
|------|------|
| 常开 | 公司一台 PC，`npm run hub` 最小化 |
| 登录 | Chrome WhatsApp 会话勿退出 |
| 时间 | 10:00 / 15:00 自动扫；开机 >3h 自动补扫 |
| 故障 | 看 `.wa-scan.log` + 线上 `/automation` |

#### 3.4 阶段 3 验收

- [ ] 历史客户在线可见
- [ ] 2 名同事并行使用无冲突
- [ ] 你改草稿、同事刷新能看到

---

### 阶段 4 · 体验加固（可选，1–2 周迭代）

按优先级排序：

| 优先级 | 功能 | 价值 |
|--------|------|------|
| P1 | 自定义域名 `crm.公司.com` | 专业、好记 |
| P1 | 扫描失败邮件/企微通知 | 不用你天天看 |
| P2 | VPS 24h 扫描（见附录 B） | 不依赖你 PC 开机 |
| P2 | 草稿「确认后一键复制」 | 同事辅助回复 |
| P3 | WhatsApp 自动发送闭环 | 仍只能在扫描机 Chrome 发 |
| P3 | 多语言看板 UI | 同事英文界面 |

---

## 三、环境与职责分工

| 环境 | 用途 | DATABASE_URL | HUB_URL |
|------|------|--------------|---------|
| **local** | 你开发调试 | Neon dev branch 或 SQLite | localhost:3000 |
| **preview** | PR 预览 | Neon branch | preview.vercel.app |
| **production** | 同事生产 | Neon main | 正式域名 |

**扫描机只连 production**（或单独 staging 做测试）。

---

## 四、成本估算（小团队）

| 服务 | 免费档 | 超出后 |
|------|--------|--------|
| Vercel Hobby | 够用 | Pro $20/月 |
| Neon | 0.5GB 免费 | ~$19/月起 |
| Vercel Blob | 1GB 免费 | 按量 |
| Clerk | 10k MAU 免费 | 极少团队会超 |
| VPS（可选） | — | $5–10/月 |

**首年预期：$0–15/月**（不含域名）。

---

## 五、风险与对策

| 风险 | 对策 |
|------|------|
| Vercel 再报 P1012 | 部署前必须连 Neon；`vercel-build.mjs` 已做映射 |
| 扫描写不进线上 | 查 `INGEST_SECRET`、`HUB_URL`、Vercel 函数 timeout（ingest 可能需优化到 <60s） |
| ingest 超时 | 流水线拆步：ingest 先存消息，pipeline 异步（后续优化） |
| WhatsApp 掉线 | 扫描机 SOP + `/automation` 状态 + 日志 |
| 同事误删客户 | 软删除或 admin-only 删除（可选 v2） |
| 数据合规 | 客户手机号存云端，需公司知情；Neon 可选 region |

---

## 六、推荐时间线

```
Week 1
  Mon-Tue   阶段 0 + 阶段 1（Postgres + Vercel 上线 + 扫描写云端）
  Wed-Thu   阶段 2（Clerk + ingest 密钥）
  Fri       阶段 3（数据迁移 + 2 同事试跑）

Week 2+
  阶段 4 按 P1→P3 迭代
```

**最小上线：** 阶段 1 + 2 + 3 ≈ **5–7 个工作日**（你确认即可开干）。

---

## 附录 A · 阶段 1 操作清单（给你复制用）

1. [ ] Neon 建项目 → 拿 `DATABASE_URL`
2. [ ] 改 Prisma → postgres → 迁移
3. [ ] Vercel 连 GitHub + Neon + Blob
4. [ ] Redeploy 直到绿
5. [ ] 扫描机 `.env`: `HUB_URL` + `INGEST_SECRET`
6. [ ] `npm run hub` → 扫 1 人 → 线上确认
7. [ ] 上 Clerk → 关公网裸奔
8. [ ] 迁 SQLite 历史数据
9. [ ] 邀请同事

---

## 附录 B · VPS 扫描（未来可选）

若不想 PC 常开：

- 选 Ubuntu 22.04，2GB RAM+
- 安装 Node 20 + Playwright Chromium
- Xvfb 虚拟显示 + `wa-auto-scan.mjs`
- systemd 服务跑 `auto-worker.mjs`
- **仍需一次人工扫码登录 WhatsApp**（会话存 volume）

成本 ~$6/月，维护成本高于本机。

---

## 附录 C · 当前仓库与计划差距

| 已有 | 还缺 |
|------|------|
| `vercel.json` + `vercel-build.mjs` | Prisma 仍 sqlite，需改 postgres |
| `storage.ts` Blob 双模式 | 全站登录 |
| `DEPLOY.md` 草稿 | `INGEST_SECRET` 实现 |
| 扫描脚本 + LinkedIn 链路 | 生产 env 与扫描机 env 文档 |
| 客户增删 UI | 角色权限 |

---

**下一步：** 你确认本计划后，从 **阶段 1.1 Postgres 迁移** 开始实施。
