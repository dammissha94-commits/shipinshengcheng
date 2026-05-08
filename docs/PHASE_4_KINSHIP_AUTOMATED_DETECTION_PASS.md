# 第四阶段 C6：中文亲属称谓自动检测通过归档

## 1. 阶段名称

第四阶段 C6：中文亲属称谓自动检测通过归档

## 2. 阶段目标

归档中文亲属称谓接入在自动检测范围内的通过结果，明确当前版本是否存在构建失败、核心路由白屏、adapter 边界破坏、技术字段泄露、禁止方向误入等问题。

本阶段只做归档，不修改业务代码、不修改数据库、不新增 migration、不调整 RLS、不新增依赖。

## 3. 关联文档

| 文件 | 作用 | 状态 |
| --- | --- | --- |
| `docs/PHASE_4_KINSHIP_MANUAL_REVIEW_SAMPLES.md` | 人工校对样本集 | 已建立 |
| `docs/PHASE_4_KINSHIP_MANUAL_REVIEW_EXECUTION.md` | 人工校对执行表 | 已建立 |
| `docs/PHASE_4_KINSHIP_MANUAL_REVIEW_RESULT.md` | 人工校对结果归档 | 已建立，结果待填写 |
| `docs/PHASE_4_KINSHIP_MANUAL_REVIEW_FIELD_TEST.md` | 真实家庭实测填写表 | 已建立，待实测 |
| `docs/PHASE_4_KINSHIP_AUTOMATED_DETECTION_REPORT.md` | 自动检测报告 | 已完成 |
| `docs/PHASE_4_KINSHIP_AUTOMATED_DETECTION_PASS.md` | 本阶段通过归档 | 已完成 |

## 4. 自动检测结论

自动检测范围内，当前版本结论如下：

| 项目 | 结论 |
| --- | --- |
| 是否发现 P0 | 否 |
| 是否发现 P1 | 自动检测范围内未发现 |
| TypeScript 是否通过 | 是 |
| lint 是否通过 | 是 |
| build 是否通过 | 是 |
| 核心路由是否可访问 | 是 |
| 是否发现核心路由白屏 | 否 |
| 是否发现 Next.js error overlay | 否 |
| `relationship-ts` 是否只由 adapter 直接引用 | 是 |
| 业务页面是否直接 import `relationship-ts` | 否 |
| 业务页面是否泄露 `KinshipResult.source` | 否 |
| fallback 是否保留 | 是 |
| 禁止方向是否出现为业务入口 | 否 |

## 5. 已通过的核心路由烟测

| 路由 | 结果 |
| --- | --- |
| `/` | 通过 |
| `/login` | 通过 |
| `/family` | 通过 |
| `/family/members` | 通过 |
| `/family/tree` | 通过 |
| `/family/tree/graph` | 通过 |
| `/family/statistics` | 通过 |
| `/family/output` | 通过 |
| `/family/calendar` | 通过 |
| `/family/meetings` | 通过 |

## 6. kinship adapter 边界归档

当前保持以下边界：

- 只有 `src/lib/kinship/kinship-adapter.ts` 直接 import `relationship-ts`。
- 业务页面只从 `@/lib/kinship/kinship-adapter` 使用称谓能力。
- 业务页面不直接依赖第三方库。
- 业务页面不显示 `KinshipResult.source`。
- 称谓计算失败时保留 fallback。

已接入页面：

- `src/app/family/members/[id]/page.tsx`
- `src/app/family/members/page.tsx`
- `src/app/family/tree/page.tsx`
- `src/app/family/tree/graph/page.tsx`

## 7. fallback 规则归档

自动检测确认以下规则仍存在：

| 场景 | 保守显示 |
| --- | --- |
| `sibling_of` 无性别 | 兄弟姐妹 |
| `grandparent_of` 无性别 | 祖辈 |
| 祖辈视角下孙辈无性别 | 孙辈 |
| kinship 计算失败 | 原有 label / fallback |

## 8. 禁止方向复核

本阶段未发现以下方向作为业务功能入口：

- 祭祀化
- 宗教化
- 上香供奉
- 功德
- 法事
- 募捐
- 捐款
- 数字牌位
- 开放社区
- IM
- 支付
- 商城
- 排行榜
- 陌生人社交

## 9. 硬校验结果

| 命令 | 结果 |
| --- | --- |
| `npx tsc --noEmit` | 通过 |
| `npm run lint` | 通过 |
| `npm run build` | 通过 |

lint 存在 2 个既有 warning：

- `src/app/family/tree/graph/page.tsx`：`Network` unused
- `src/app/family/tree/page.tsx`：`Link` unused

## 10. 自动检测限制

本阶段只能声明：

**中文亲属称谓自动检测通过。**

不能声明：

**真实家庭人工称谓校对通过。**

原因：

- 自动检测无法判断某个家庭实际是否习惯某种称谓。
- 自动检测无法替代真实家庭成员对“自然、不别扭、可信”的判断。
- 兄弟姐妹、祖辈、孙辈等保守称谓需要真实样本确认。
- 地域称谓、父系/母系称谓、长幼称谓仍需后续样本积累。

## 11. 当前阶段判定

| 项目 | 判定 |
| --- | --- |
| 是否可进入称谓 P0/P1 修复 | 暂不需要，自动检测未发现 P0/P1 |
| 是否可进入复杂亲属称谓扩展 | 不建议 |
| 是否可继续归档为自动检测通过 | 可以 |
| 是否需要真实家庭人工填写 | 需要 |
| 是否建议继续接入新页面 | 不建议 |

## 12. 下一步唯一建议动作

下一步建议进入：

**第四阶段 D：真实家庭使用体验问题池整理**

原因：

- 当前自动检测未发现称谓 P0/P1。
- 人工称谓校对仍需真实家庭填写，不宜凭空推进修复。
- 项目已进入稳定化阶段，应开始整理真实使用中的 P2/P3 体验问题池。
- 后续优化应从真实使用痛点排序，而不是继续扩展功能。
