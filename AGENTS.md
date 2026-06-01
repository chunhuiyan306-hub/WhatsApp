# Agent 必读（WhatsApp 客户看板）

> 用户**不应**每次提醒「扫 WhatsApp」「查 LinkedIn」。见到相关意图时**直接执行**，不要只解释。

## 用户说什么 → 你做什么

| 用户说 | 你必须做 |
|--------|----------|
| 启动 / 开看板 / 刷新 | `npm run hub`（或确认已在跑）→ 等扫描完成 → 确认 LinkedIn 已跑 |
| 扫完了 / 扫描完成 | 检查 `/api/automation` 日志 → 未跑 LinkedIn 则 `POST /api/research/linkedin` → 低置信度客户 Web 深度调查 |
| 今天新客户 / 漏了 | 直接 `npm run auto:scan-once`，不要只调 API |
| 删低价值客户 | 引导 `/customers` 批量删除，或帮用户筛选 |

## 完整流程（不可省略）

```
WhatsApp 扫描(30会话) → ingest → 流水线 → LinkedIn/公开检索 → 看板可回复
```

**禁止**把 WhatsApp 扫描当作终点。

## 一条命令启动（告诉用户）

```bash
npm run hub
```

= 看板 + 定时 Worker + **启动时自动补扫**（距上次 >3 小时）

## 云端团队版

- 看板部署 Vercel + Neon Postgres + Clerk 登录
- 扫描机本机 `.env.scanner` → `HUB_URL` + `INGEST_SECRET`
- 部署步骤见 `docs/DEPLOY.md`

## 扫描必须弹出 Chrome

- **不是** Cursor 侧边栏浏览器（WhatsApp 不支持）
- 必须跑 `scripts/wa-auto-scan.mjs` 或 `npm run auto:scan-once`
- API `scan-once` 仅作看板按钮用；Agent 手动触发优先用 CLI

## 日志与排错

- 扫描日志：`.wa-scan.log`
- 自动化状态：http://localhost:3000/automation
- 卡住 `running` >25 分钟：会自动重置，可重扫

## 参考

- `docs/PLAYBOOK.md`
- `.cursor/rules/post-scan-linkedin.mdc`
