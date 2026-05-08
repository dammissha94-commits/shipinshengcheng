# 吾家祠堂 APP — WorkBuddy 系统审计报告
**审计轮次**：第 1 轮（只审计，不改代码）
**审计日期**：2026-05-07
**审计范围**：全量代码 + build/lint + 核心闭环 + 禁止功能检查

---

## 一、项目概况

| 项目信息 | 值 |
|---|---|
| 框架 | Next.js 16.2.4 (Turbopack) + React 19.2.4 |
| UI | Tailwind CSS 4 + 自定义 CSS token |
| 后端 | Supabase (PostgreSQL + Auth + RLS) |
| 路由架构 | App Router，22 个路由 |
| Build 状态 | ✅ 成功（Turbopack，3.6s compile） |
| Lint 状态 | ⚠️ 4 errors + 11 warnings |

---

## 二、Lint & Build 审计

### ✅ Build：通过
```
> next build
▲ Next.js 16.2.4 (Turbopack)
✓ Compiled successfully in 3.6s
✓ TypeScript check: 5.5s
✓ All 22 pages generated successfully
```

### ⚠️ Lint：4 个错误 + 11 个警告

**错误（必须修复）**：
| 文件 | 行号 | 规则 | 问题 |
|---|---|---|---|
| `scripts/replace-hex.cjs` | 14, 15 | no-require-imports | 使用 `require()` 而非 `import` |
| `scripts/replace-stone.cjs` | 1, 2 | no-require-imports | 使用 `require()` 而非 `import` |

**警告（建议修复）**：
| 文件 | 行号 | 规则 | 问题 |
|---|---|---|---|
| `src/app/family/calendar/[id]/page.tsx` | 235, 238, 241 | no-unused-vars | `F`, `SF`, `Toggle` 定义但未使用 |
| `src/app/family/meetings/[id]/page.tsx` | 260 | no-unused-vars | `statusVariant` 赋值但未使用 |
| `src/app/family/members/[id]/page.tsx` | 6 | no-unused-vars | `Trash2` 定义但未使用 |
| `src/app/family/members/[id]/page.tsx` | 385 | alt-text | `<img>` 缺少 alt 属性 |
| `src/app/family/output/page.tsx` | 16 | no-unused-vars | `SectionCard` 定义但未使用 |
| `src/app/family/photos/page.tsx` | 187, 242, 283 | no-img-element | 使用 `<img>` 而非 `<Image />` |
| `src/app/family/photos/page.tsx` | 247 | alt-text | `<img>` 缺少 alt 属性 |

---

## 三、核心闭环审计

用户旅程：**注册登录 → 创建姓氏家堂 → 录入亲属 → 生成家族树 → 邀请亲属认领 → 亲属完善生平 → 亲属继续补充自己的亲属**

### 3.1 注册登录 ✅
- **文件**：`src/app/login/page.tsx`
- **功能**：邮箱 + 密码登录/注册，Supabase Auth
- **状态**：✅ 功能完整，有 loading/error 状态处理
- **问题**：
  - [P0] `login/page.tsx:69` 硬编码阴影 `shadow-[0_12px_28px_rgba(90,53,36,0.07)]`
  - [P0] `login/page.tsx:116` 硬编码阴影 `shadow-[0_14px_26px_rgba(90,53,36,0.24)]`
  - [中] "记住我" 复选框功能未实现（勾选无效果）
  - [低] "忘记密码?" 无链接目标

### 3.2 创建姓氏家堂 ✅
- **文件**：`src/app/create/page.tsx`
- **功能**：填写姓氏 + 姓名 → 创建 family_space
- **状态**：✅ 功能完整，有预览卡片
- **问题**：
  - [P0] `create/page.tsx:100` 硬编码阴影 `shadow-[0_14px_36px_rgba(90,53,36,0.08)]`
  - [P0] `create/page.tsx:110` 硬编码阴影 `shadow-[0_18px_42px_rgba(90,53,36,0.24)]`
  - [中] 创建成功后跳转到 `/family`，但未检查是否已有 family_space（可能重复创建）

### 3.3 录入亲属 ✅
- **文件**：`src/app/family/relatives/new/page.tsx`
- **功能**：选择关系（父子/配偶/兄弟姐妹）→ 填写姓名性别 → 保存并创建 relation
- **状态**：✅ 功能完整，relation 自动创建
- **问题**：
  - [P0] `relatives/new/page.tsx:97` 硬编码阴影 `shadow-[0_10px_28px_rgba(90,53,36,0.06)]`（×2 处）
  - [中] 不支持批量添加亲属
  - [低] 出生年份选择器范围到 `currentYear - 5`，可能不够（建议 `- 10` 或更多）

### 3.4 生成家族树 ✅
- **文件**：`src/app/family/tree/page.tsx`（三代谱）+ `src/app/family/tree/graph/page.tsx`（可视化图谱）
- **功能**：
  - `tree/page.tsx`：三代谱卡片式展示（祖辈、父母、自己、配偶、兄弟姐妹、子女）
  - `tree/graph/page.tsx`：React Flow 可视化图谱
- **状态**：✅ 核心功能完整
- **问题**：
  - [P0] `tree/page.tsx:108` 硬编码阴影 `shadow-[0_12px_30px_rgba(90,53,36,0.06)]`
  - [P0] `tree/graph/page.tsx:136` 硬编码阴影 `shadow-[0_18px_42px_rgba(90,53,36,0.22)]`
  - [中] 三代谱仅显示核心关系，扩展亲属（叔伯、堂兄弟姐妹等）不显示
  - [中] Graph 页面在大范围亲属时可能性能较差（未做虚拟化）

### 3.5 邀请亲属认领 ✅
- **文件**：`src/app/family/invite/page.tsx`
- **功能**：列出待认领成员 → 生成邀请 token → 复制邀请文案（含链接）→ 家人打开链接认领
- **状态**：✅ 功能完整，token 机制安全
- **问题**：
  - [中] 邀请文案为纯文本，未在微信中生成链接预览（无 Open Graph 标签）
  - [中] 无邀请有效期限制（token 永久有效）
  - [低] 复制成功后提示 `已复制`，但未提供"复制失败"的降级方案（如手动选择文本）

### 3.6 亲属完善生平 ✅
- **文件**：
  - 认领：`src/app/claim/[token]/page.tsx`
  - 生平记录：`src/app/family/stories/page.tsx` + `src/app/family/members/[id]/page.tsx`（WjTimeline）
- **功能**：
  - 认领：打开链接 → 登录 → 认领档案 → 完善资料
  - 生平：在成员详情页通过 WjTimeline 记录生平事件
- **状态**：✅ 核心功能完整
- **问题**：
  - [P0] `stories/page.tsx:30` 硬编码阴影 `shadow-[0_8px_20px_rgba(90,53,36,0.05)]`
  - [P0] `members/[id]/page.tsx` 多处硬编码阴影（已在之前工作中部分替换）
  - [中] 生平记录仅支持文字，不支持上传图片/音频
  - [中] WjTimeline 组件替换未完成（部分页面仍用手动实现）

### 3.7 亲属继续补充自己的亲属（二次裂变）✅
- **机制**：认领后，亲属可以访问 `/family/relatives/new` 添加自己的亲属
- **状态**：✅ 权限设计正确（RLS 策略限制只能添加自己 family 的亲属）
- **问题**：[低] 无引导流程（认领后直接跳到成员详情页，未提示"添加你的亲属"）

---

## 四、禁止功能检查 ✅

| 禁止项 | 检查结果 |
|---|---|
| 祭祀、上香、贡品、牌位 | ✅ 无相关代码 |
| 功德榜 | ✅ 无相关代码 |
| 开放社区 | ✅ 无相关代码（所有页面需登录） |
| IM 即时通讯 | ✅ 无相关代码 |
| 商城、排行榜、支付 | ✅ 无相关代码 |
| 展示手机号 | ✅ 无手机号字段（仅邮箱登录） |
| 公开未成年人详细资料 | ✅ RLS 策略限制 `visibility` 字段，默认 `family` |
| 大重构 | ✅ 本次审计未发现大重构需求 |
| 随意改数据库 | ✅ Supabase migrations 规范，未发现问题 |

---

## 五、硬编码阴影值审计 ⚠️

**问题**：大量阴影值直接硬编码在 className 中，而非使用 CSS token。

**已定义但未充分使用的 token**（`globals.css`）：
```css
--shadow-warm-xs: 0 4px 14px rgba(90, 53, 36, 0.06);
--shadow-warm-sm: 0 8px 20px rgba(90, 53, 36, 0.08);
--shadow-warm: 0 10px 28px rgba(90, 53, 36, 0.12);
--shadow-warm-md: 0 12px 28px rgba(90, 53, 36, 0.16);
--shadow-warm-lg: 0 18px 42px rgba(90, 53, 36, 0.22);
--shadow-warm-xl: 0 18px 48px rgba(90, 53, 36, 0.24);
--shadow-warm-2xl: 0 20px 56px rgba(90, 53, 36, 0.28);
```

**需替换的文件**（部分已在之前工作中替换，但审计发现仍有遗漏）：
- `login/page.tsx` — 2 处
- `create/page.tsx` — 2 处
- `family/page.tsx` — 已替换 ✅
- `family/members/page.tsx` — 已替换 ✅
- `family/members/[id]/page.tsx` — 部分替换 ⚠️
- `family/tree/page.tsx` — 1 处
- `family/tree/graph/page.tsx` — 2 处
- `family/stories/page.tsx` — 1 处
- `family/photos/page.tsx` — 多处
- `family/meetings/page.tsx` — 多处
- `family/meetings/[id]/page.tsx` — 多处
- `family/calendar/page.tsx` — 1 处
- `family/settings/page.tsx` — 2 处
- `family/statistics/page.tsx` — 1 处
- `family/reminders/page.tsx` — 1 处
- `family/output/page.tsx` — 2 处
- `claim/[token]/page.tsx` — 多处

**建议**：第二轮（P0-A）优先替换登录、/family、/create 中的硬编码阴影。

---

## 六、跳转问题审计 ⚠️

| 页面 | 跳转逻辑 | 问题 |
|---|---|---|
| 登录页 | 登录成功 → `sanitizeRedirectPath(redirect)` | ✅ 正常 |
| 创建家堂 | 创建成功 → `/family` | ✅ 正常 |
| 添加亲属 | 保存成功 → `/family/tree` | ⚠️ 应跳转到 `/family/members` 更合理 |
| 邀请认领 | 无主动跳转 | ℹ️ 正常（停留在邀请页等待复制） |
| 认领成功 | 认领成功 → 无跳转 | ⚠️ 应提示"查看我的资料"按钮跳转到 `/family/members/[id]` |

---

## 七、触控目标审计（44px 合规）✅

根据之前的工作记录，已完成：
- ✅ `family/activity/page.tsx`
- ✅ `family/calendar/page.tsx`
- ✅ `family/meetings/page.tsx`
- ✅ `family/calendar/[id]/page.tsx`
- ✅ `family/photos/page.tsx`
- ✅ `family/tree/page.tsx`
- ✅ `family/members/page.tsx`
- ✅ `family/page.tsx`
- ✅ `family/statistics/page.tsx`

**待检查**（第一轮审计发现）：
- ⚠️ `family/meetings/[id]/page.tsx` — 任务 #14 标记 `in_progress`
- ⚠️ `components/` 目录 — 任务 #15 标记 `completed`，但建议复查

---

## 八、RLS 安全审计 ✅

查看 `supabase/migrations` 中的 RLS 策略：
- ✅ `20260429_init_wujia_citang_core.sql` — 基础 RLS
- ✅ `20260430_fix_visibility_rls.sql` — 修复 visibility 策略
- ✅ `20260501_fix_real_test_blockers.sql` — 修复测试阻塞问题

**结论**：RLS 策略设计合理，用户只能访问自己 family 的数据。

---

## 九、第二轮（P0-A）修复建议

**优先级排序**（按用户要求：只修 P0-A：登录、/family、/create、lint/build、跳转问题）：

### P0-A.1 修复 Lint 错误（4 个）
- **文件**：`scripts/replace-hex.cjs`, `scripts/replace-stone.cjs`
- **方案**：将 `require()` 改为 `import`，或添加 ESLint 禁用注释（如果脚本仅在构建时使用）

### P0-A.2 替换硬编码阴影（登录、/family、/create）
- **文件**：
  - `login/page.tsx` — 2 处
  - `create/page.tsx` — 2 处
  - 以及之前工作中已替换但需验证的文件
- **方案**：使用已在 `globals.css` 定义的 shadow token

### P0-A.3 修复跳转问题
- **文件**：
  - `family/relatives/new/page.tsx` — 保存成功后跳转目标
  - `claim/[token]/page.tsx` — 认领成功后添加"查看我的资料"按钮

### P0-A.4 运行 lint + build 验证
- 每轮结束必须运行 `npm run lint` 和 `npm run build`
- 确保 0 错误（警告可暂时忽略）

---

## 十、审计总结

| 维度 | 评分 | 说明 |
|---|---|---|
| Build 状态 | ✅ A | 22 个路由全部构建成功 |
| Lint 状态 | ⚠️ B | 4 个错误需修复，11 个警告建议修复 |
| 核心闭环 | ✅ A | 所有核心功能完整，流程通畅 |
| 禁止功能 | ✅ A | 未发现任何禁止功能 |
| 阴影 token | ⚠️ C | token 已定义但未充分使用，大量硬编码 |
| 触控目标 | ✅ A | 已完成 9 个文件，符合 44px 标准 |
| 跳转逻辑 | ⚠️ B | 部分跳转目标不够合理 |
| RLS 安全 | ✅ A | 策略设计合理 |

**总体评价**：项目核心功能完整，架构清晰，但在代码规范（lint 错误、硬编码阴影）方面需改进。第二轮应优先修复 P0-A 问题，确保 lint + build 通过。

---

**审计报告生成时间**：2026-05-07 09:16
**下一次轮次**：第 2 轮（只修 P0-A：登录、/family、/create、lint/build、跳转问题）
