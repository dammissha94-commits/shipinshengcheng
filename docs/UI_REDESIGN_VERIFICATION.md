# 页面美化全站回归验收与归档

## 1. 页面美化范围

本次全站美化覆盖全部 20 个业务页面，分 6 个批次执行：

| 批次 | 名称 | 覆盖页面 |
| --- | --- | --- |
| UI-0 | 设计系统与基础组件 | 新增 `docs/UI_REDESIGN_SYSTEM.md` + `src/components/wujia/` 7 组件 |
| UI-1 | 登录/创建/家堂首页 | `/login` `/create` `/family` |
| UI-2 | 成员/档案/添加亲属/邀请/认领 | `/family/members` `/family/members/[id]` `/family/relatives/new` `/family/invite` `/claim/[token]` |
| UI-3 | 三代谱/2D 图谱 | `/family/tree` `/family/tree/graph` |
| UI-4 | 故事/相册/议事/议事详情/成果物 | `/family/stories` `/family/photos` `/family/meetings` `/family/meetings/[id]` `/family/output` |
| UI-5 | 日历/提醒/看板/设置 | `/family/calendar` `/family/calendar/[id]` `/family/reminders` `/family/statistics` `/family/settings` |

## 2. 设计系统

### 颜色令牌
| 用途 | 旧 (pine/cream) | 新 (wujia) |
| --- | --- | --- |
| 页面背景 | `bg-cream` | `bg-stone-50` |
| 主色/header | `bg-pine` | `bg-emerald-950` |
| 卡片背景 | `bg-card` | `bg-white` |
| 边框 | `border-sand` | `border-stone-200` |
| 弱文字 | `text-muted` | `text-stone-500` |
| 点缀 | `text-gold`/`bg-gold/10` | `text-amber-600`/`bg-amber-50` |
| 成功标签 | `bg-pine/10 text-pine` | `bg-emerald-50 text-emerald-700` |
| 警告标签 | `bg-gold/10 text-gold` | `bg-amber-50 text-amber-700` |

### 组件风格
- 卡片：`rounded-2xl border border-stone-200 bg-white shadow-sm`
- 输入框：`rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20`
- 主按钮：`bg-emerald-950 text-white shadow-sm hover:bg-emerald-900 rounded-xl`
- Section 标题：金色竖线 `h-4 w-[3px] rounded-full bg-amber-500/60` + `text-base font-semibold text-stone-800`

## 3. 已改页面（20/20）

| # | 路由 | 状态 |
| --- | --- | --- |
| 1 | `/login` | ✅ wujia 设计语言 |
| 2 | `/create` | ✅ wujia 设计语言 |
| 3 | `/family` | ✅ wujia 设计语言 |
| 4 | `/family/members` | ✅ wujia 设计语言 |
| 5 | `/family/members/[id]` | ✅ wujia 设计语言 |
| 6 | `/family/relatives/new` | ✅ wujia 设计语言 |
| 7 | `/family/invite` | ✅ wujia 设计语言 |
| 8 | `/claim/[token]` | ✅ wujia 设计语言 |
| 9 | `/family/tree` | ✅ wujia 设计语言 |
| 10 | `/family/tree/graph` | ✅ wujia 设计语言 |
| 11 | `/family/stories` | ✅ wujia 设计语言 |
| 12 | `/family/photos` | ✅ wujia 设计语言 |
| 13 | `/family/meetings` | ✅ wujia 设计语言 |
| 14 | `/family/meetings/[id]` | ✅ wujia 设计语言 |
| 15 | `/family/output` | ✅ wujia 设计语言 |
| 16 | `/family/calendar` | ✅ wujia 设计语言 |
| 17 | `/family/calendar/[id]` | ✅ wujia 设计语言 |
| 18 | `/family/reminders` | ✅ wujia 设计语言 |
| 19 | `/family/statistics` | ✅ wujia 设计语言 |
| 20 | `/family/settings` | ✅ wujia 设计语言 |

## 4. 未改业务逻辑清单

| 模块 | 状态 |
| --- | --- |
| Auth (登录/注册/session) | 未修改 |
| 家堂创建/设置保存 | 未修改 |
| 成员查询/编辑/认领 | 未修改 |
| 关系写入 (添加亲属) | 未修改 |
| 三代谱数据映射 | 未修改 |
| 2D 图谱布局/搜索/筛选/高亮/PNG 导出 | 未修改 |
| 家族故事/相册 CRUD | 未修改 |
| 议事创建/投票/意见/归档 | 未修改 |
| 成果物 service/生成预览 | 未修改 |
| 日历新增/编辑/归档/yearly 提醒 | 未修改 |
| 提醒查询 | 未修改 |
| 统计 service | 未修改 |
| kinship adapter / 称谓展示 | 未修改 |
| Supabase 查询逻辑 | 未修改 |
| 权限/鉴权 | 未修改 |

## 5. 未改数据库/RLS/services/types 清单

| 层级 | 状态 |
| --- | --- |
| 数据库表结构 | 未修改 |
| migration | 未新增 |
| RLS policy | 未修改 |
| `src/lib/services/` | 未修改（除 Phase 4B output-service 性能优化） |
| `src/types/domain.ts` | 未修改 |
| `src/types/service.ts` | 未修改 |
| `package.json` | 未修改 |
| `package-lock.json` | 未修改 |

## 6. 禁止方向检查

| 禁止项 | 状态 |
| --- | --- |
| 祭祀化 | 未出现 |
| 宗教化 | 未出现 |
| 上香/供奉/香火 | 未出现 |
| 功德/法事/祈福 | 未出现 |
| 募捐/捐款 | 未出现 |
| 数字牌位/灵位 | 未出现 |
| 纪念馆化 | 未出现 |
| 开放社区/陌生人社交 | 未出现 |
| IM | 未出现 |
| 支付 | 未出现 |
| 宗族化文案（光宗耀祖等） | 未出现 |

## 7. tsc / lint / build 结果

执行日期：2026-05-02

| 校验 | 结果 |
| --- | --- |
| `npx tsc --noEmit` | ✅ 通过 |
| `npm run lint` (src/) | ✅ 0 error / 1 pre-existing warning (`<img>` in photos) |
| `npm run build` | ✅ 通过（21/21 页面） |

## 8. 剩余问题

| # | 问题 | 页面 | 优先级 |
| --- | --- | --- | --- |
| 1 | 首页 (`/`) 仍使用旧 `bg-cream`/`bg-pine`/`bg-gold`/`border-sand` token | `src/app/page.tsx` | P3 |
| 2 | Root layout 仍使用 `bg-cream text-charcoal` | `src/app/layout.tsx` | P3 |
| 3 | Auth callback 页仍使用 `bg-cream` | `src/app/auth/callback/page.tsx` | P3 |
| 4 | 全局 CSS 仍定义 pine/cream/sand/gold 变量 | `src/app/globals.css` | P3 |
| 5 | `src/components/wujia/` 7 组件尚未被业务页面 import 使用 | — | P3 |
| 6 | `<img>` 标签未替换为 `next/image` | `src/app/family/photos/page.tsx` | P3 |

## 9. 下一步建议

1. **UI-7**：将首页、layout、auth callback 切换为 wujia 设计语言
2. **UI-8**：逐步将业务页面迁移到 `src/components/wujia/` 组件（AppShell/PageHeader/SectionCard 等），减少重复代码
3. **UI-9**：全局 CSS 清理——移除不再使用的旧 CSS 变量
4. **UI-10**：接入 `next/image` 替换 `<img>` 标签

建议 UI-7~UI-10 在同一批次中完成，然后做全站最终验收。
