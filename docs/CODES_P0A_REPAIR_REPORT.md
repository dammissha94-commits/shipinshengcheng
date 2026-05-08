# 吾家祠堂 APP P0-A 修复报告

修复时间：2026-05-06

本轮范围：只修复导致项目无法运行、无法构建或核心闭环断裂的 P0-A 问题。不新增功能，不修改数据库，不新增 migration，不调整 RLS。

## 一、修改文件清单

| 文件 | 修改类型 | 说明 |
| --- | --- | --- |
| `eslint.config.mjs` | 构建工具修复 | 忽略 `.claude/**` 临时工作树，避免 lint 扫描历史/生成产物 |
| `src/app/login/page.tsx` | 核心闭环修复 | 登录页从“手机验证码/微信”改为真实可用的邮箱密码登录/注册 |
| `src/types/domain.ts` | 类型一致性修复 | 同步 `ClaimStatus` 与 `InviteStatus` 的数据库状态 |
| `src/lib/services/invite-service.ts` | service 类型修复 | 移除 `rejected` 状态的强制类型绕过 |
| `src/lib/genealogy/graph-types.ts` | 展示类型修复 | 补齐认领状态图谱标签类型 |
| `src/lib/genealogy/graph-adapter.ts` | 展示 fallback 修复 | 补齐 `rejected` / `hidden` 认领状态图谱标签 |
| `src/app/family/members/page.tsx` | 展示 fallback 修复 | 成员列表补齐 `rejected` / `hidden` 状态标签 |
| `src/app/family/members/[id]/page.tsx` | 展示 fallback 修复 | 成员详情补齐 `rejected` / `hidden` 状态标签 |
| `docs/CODES_P0A_REPAIR_REPORT.md` | 文档归档 | 记录本轮 P0-A 修复范围与验收结果 |

## 二、修复的问题

| 问题 | 风险 | 修复结果 |
| --- | --- | --- |
| `npm run lint` 扫描 `.claude/worktrees` 下的 `.next` 生成文件 | 当前项目 lint 被无关历史工作树阻断 | 已在 ESLint global ignores 中排除 `.claude/**` |
| `/login` 文案为手机验证码/微信，但实际只支持邮箱密码登录 | 被邀请亲属无法明确完成“注册并认领节点”闭环 | 已改为邮箱密码登录/注册，并调用已有 `signUpWithEmail()` |
| `/login` 没有实际注册调用 | 新用户无法从邀请认领入口完成注册 | 已增加登录/注册模式切换，注册成功后按 Supabase 邮箱确认状态处理 |
| `ClaimStatus` 未包含数据库已支持的 `rejected` / `hidden` | 拒绝认领、隐藏状态可能导致类型绕过和展示缺口 | 已同步类型和展示标签 |
| `InviteStatus` 未包含 `rejected` | 拒绝邀请只能通过强制类型写入 | 已同步类型并移除强制类型 cast |

## 三、未修复的问题

| 问题 | 原因 | 建议阶段 |
| --- | --- | --- |
| Tailwind 非标准颜色类如 `bg-#...` | 审计报告归为 P0-B/P1，本轮禁止 UI 美化和大范围样式修复 | 下一批 P0-B |
| migration 历史重复和命名混乱 | 本轮禁止数据库结构修改，不新增 migration | 单独做 migration 执行顺序审计 |
| Storage bucket public read 风险 | 涉及 Supabase Storage/RLS 审计，本轮不修改配置 | 单独做权限合规审计 |
| `memorial_day` 命名收敛 | 涉及产品文案和语义收敛，不属于本轮 P0-A | P0-B/P1 |
| 既有 lint warning | 当前不阻断 lint/build，且多为图片 alt、`img` 优化和未使用导入 | P1/P2 |

## 四、是否改数据库

否。

本轮没有新增 migration，没有修改 Supabase schema，没有修改 RLS，没有使用 service_role。

## 五、是否影响现有数据

不影响现有数据。

本轮只同步前端类型和展示 fallback，不修改已存数据。`rejectInviteToken()` 的写入状态与既有 migration 支持的 `rejected` 保持一致。

## 六、lint 结果

`npm run lint`：通过。

剩余 8 个 warning，均未阻断：

- 图片 `alt` warning
- `<img>` 优化 warning
- `SectionCard` 未使用 warning

## 七、build 结果

`npm run build`：通过。

Next.js 16.2.4 成功构建 22 个 App Router 页面，包括：

- `/login`
- `/claim/[token]`
- `/family`
- `/family/tree`
- `/family/tree/graph`
- `/family/members`
- `/family/members/[id]`

## 八、下一步建议

建议进入下一批 P0-B：

1. 修复 Tailwind 非标准颜色类，确保 UI 统一样式真实生效。
2. 归档 migration 执行顺序和重复风险，不立即改历史 migration。
3. 单独做 Storage/RLS 合规审计，尤其是家庭相册私密访问边界。
