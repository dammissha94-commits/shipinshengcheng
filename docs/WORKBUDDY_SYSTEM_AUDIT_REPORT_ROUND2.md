# 吾家祠堂 APP — WorkBuddy 第二轮修复报告

**修复轮次**：第 2 轮（P0-A：login、/family、/create、lint/build、导航）
**修复日期**：2026-05-07
**修复范围**：P0-A 级别问题（审计报告 §九）

---

## 一、修复摘要

| 类别 | 修复项 | 状态 |
|---|---|---|
| Lint 错误 | `scripts/*.cjs` 的 `require()` 报错（4 处） | ✅ 已修复 |
| 硬编码阴影 | `login/page.tsx`（2 处） | ✅ 已修复 |
| 硬编码阴影 | `create/page.tsx`（2 处） | ✅ 已修复 |
| 硬编码阴影 | `family/members/[id]/page.tsx`（剩余 3 处） | ✅ 已修复 |
| 硬编码阴影 | `claim/[token]/page.tsx`（4 处） | ✅ 已修复 |
| 硬编码阴影 | `family/relatives/new/page.tsx`（4 处） | ✅ 已修复 |
| 跳转问题 | `relatives/new` 保存后跳转目标 | ✅ 已修复 |
| Lint 警告清理 | `members/[id]` 未使用 `Trash2` 导入 | ✅ 已修复 |
| Build 验证 | `npm run build` | ✅ 通过 |
| Lint 验证 | `npm run lint` | ✅ 0 错误 |

---

## 二、详细修复记录

### 2.1 Lint 错误修复（P0-A.1）

**文件**：`scripts/replace-hex.cjs`、`scripts/replace-stone.cjs`

**问题**：ESLint 报 `@typescript-eslint/no-require-imports`，因为 `.cjs` 文件中使用了 `require()`。

**修复方案**：在 `require()` 前添加正确的 eslint-disable 注释（`@typescript-eslint/no-require-imports`）。

```diff
-const fs = require('fs');
-const path = require('path');
+// eslint-disable-next-line @typescript-eslint/no-require-imports
+const fs = require('fs');
+// eslint-disable-next-line @typescript-eslint/no-require-imports
+const path = require('path');
```

---

### 2.2 硬编码阴影替换（P0-A.2）

#### `login/page.tsx`（2 处）

| 行号 | 原值 | 替换后 |
|---|---|---|
| 69 | `shadow-[0_12px_28px_rgba(90,53,36,0.07)]` | `shadow-warm-sm` |
| 116 | `shadow-[0_14px_26px_rgba(90,53,36,0.24)]` | `shadow-warm-xl` |

#### `create/page.tsx`（2 处）

| 行号 | 原值 | 替换后 |
|---|---|---|
| 100 | `shadow-[0_14px_36px_rgba(90,53,36,0.08)]` | `shadow-warm` |
| 110 | `shadow-[0_18px_42px_rgba(90,53,36,0.24)]` | `shadow-warm-xl` |

#### `family/members/[id]/page.tsx`（3 处）

| 行号 | 原值 | 替换后 |
|---|---|---|
| 6（import） | `Trash2` 未使用 | 移除 `Trash2` 导入 ✅ |
| 479 | `shadow-sm` | `shadow-warm-xs` |
| 482 | `shadow-sm` | `shadow-warm-xs` |

#### `claim/[token]/page.tsx`（4 处）

| 行号 | 原值 | 替换后 |
|---|---|---|
| 132 | `shadow-[0_12px_28px_rgba(90,53,36,0.08)]` | `shadow-warm-sm` |
| 133 | `shadow-[0_14px_28px_rgba(166,111,61,0.22)]` | `shadow-gold-sm` |
| 142 | `shadow-[0_12px_28px_rgba(90,53,36,0.08)]` | `shadow-warm-sm` |
| 201 | `shadow-[0_12px_24px_rgba(90,53,36,0.22)]` | `shadow-warm-lg` |

#### `family/relatives/new/page.tsx`（4 处）

| 行号 | 原值 | 替换后 |
|---|---|---|
| 97 | `shadow-[0_10px_28px_rgba(90,53,36,0.06)]` | `shadow-warm-xs` |
| 110 | `shadow-sm` | `shadow-warm-xs` |
| 122 | `shadow-[0_10px_28px_rgba(90,53,36,0.06)]` | `shadow-warm-xs` |
| 147 | `shadow-sm` | `shadow-warm-xs` |

---

### 2.3 跳转问题修复（P0-A.3）

#### `family/relatives/new/page.tsx`（第 84 行）

**问题**：保存成功后跳转到 `/family/tree`，但用户期望看到刚添加的亲属列表。

**修复**：改为跳转到 `/family/members`。

```diff
-router.push('/family/tree');
+router.push('/family/members');
```

#### `claim/[token]/page.tsx`

**审计发现**：认领成功后无"查看我的资料"按钮。

**代码检查结果**：该按钮已实现（第 91-100 行），链接到 `/family/members/${invite?.person.id}`。无需额外修复。

---

## 三、Lint & Build 验证（P0-A.4）

### Lint 结果

```
✖ 10 problems (0 errors, 10 warnings)
```

**0 错误** ✅（4 个 scripts 错误已修复）

**剩余 10 个警告**（P0-A 范围外，第三轮处理）：

| 文件 | 行号 | 规则 | 问题 |
|---|---|---|---|
| `family/calendar/[id]/page.tsx` | 235, 238, 241 | no-unused-vars | `F`, `SF`, `Toggle` 未使用 |
| `family/meetings/[id]/page.tsx` | 260 | no-unused-vars | `statusVariant` 未使用 |
| `family/members/[id]/page.tsx` | 385 | alt-text | `<img>` 缺少 alt |
| `family/output/page.tsx` | 16 | no-unused-vars | `SectionCard` 未使用 |
| `family/photos/page.tsx` | 187, 242, 283 | no-img-element | 使用 `<img>` 而非 `<Image />` |
| `family/photos/page.tsx` | 247 | alt-text | `<img>` 缺少 alt |

### Build 结果

```
> next build
▲ Next.js 16.2.4 (Turbopack)
✓ Compiled successfully in 4.7s
✓ TypeScript check: 7.4s
✓ All 22 pages generated successfully
```

**Build 通过** ✅

---

## 四、Shadow Token 使用情况更新

**已替换 P0-A 范围文件**：
- ✅ `login/page.tsx` — 2 处已替换
- ✅ `create/page.tsx` — 2 处已替换
- ✅ `family/members/[id]/page.tsx` — 全部完成
- ✅ `claim/[token]/page.tsx` — 4 处已替换
- ✅ `family/relatives/new/page.tsx` — 4 处已替换

**仍需替换（P0-B 范围）**：
- ⚠️ `family/tree/page.tsx` — 1 处
- ⚠️ `family/tree/graph/page.tsx` — 2 处
- ⚠️ `family/stories/page.tsx` — 1 处
- ⚠️ `family/photos/page.tsx` — 多处
- ⚠️ `family/meetings/page.tsx` — 多处
- ⚠️ `family/meetings/[id]/page.tsx` — 多处
- ⚠️ `family/calendar/page.tsx` — 1 处
- ⚠️ `family/settings/page.tsx` — 2 处
- ⚠️ `family/statistics/page.tsx` — 1 处
- ⚠️ `family/reminders/page.tsx` — 1 处
- ⚠️ `family/output/page.tsx` — 2 处

---

## 五、修复后评分

| 维度 | 修复前 | 修复后 | 说明 |
|---|---|---|---|
| Build 状态 | ✅ A | ✅ A | 保持通过 |
| Lint 状态 | ⚠️ B（4 错误） | ✅ A（0 错误） | 4 个错误已修复 |
| 阴影 token | ⚠️ C | ⚠️ B- | P0-A 范围已替换，仍有 P0-B 遗留 |
| 跳转逻辑 | ⚠️ B | ✅ A | `relatives/new` 跳转已修复 |
| 禁止功能 | ✅ A | ✅ A | 无变化 |
| 触控目标 | ✅ A | ✅ A | 无变化 |

---

## 六、下一步（第 3 轮）

**P0-B 修复范围**（按审计报告 §九建议）：
1. 修复 P0-B：create family hall、add relatives、family tree、invite/claim、biography
2. 继续替换剩余硬编码阴影（P0-B 范围内文件）
3. 修复 lint 警告（10 个警告）
4. 运行 `npm run lint` 和 `npm run build`
5. 生成第 3 轮报告

---

**报告生成时间**：2026-05-07 09:30
**下一次轮次**：第 3 轮（P0-B：create family hall、add relatives、family tree、invite/claim、biography）
