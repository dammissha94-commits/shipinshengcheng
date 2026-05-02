# 家族动态页面代码结构分析报告

## 一、工作区状态

- **git status --short 结果**：空（工作区干净）
- **是否可以继续分析**：✅ 是

## 二、是否已有独立"家族动态页面"

- **是否存在**：❌ 不存在
- **路径**：无
- **当前功能**：无
- **当前数据来源**：无
- **当前 UI 结构**：无

## 三、首页是否已有"家堂动态 / 最近更新"模块

- **是否存在**：✅ 部分存在（Dashboard 内嵌）
- **文件路径**：`src/app/family/page.tsx`
- **当前展示内容**：
  - **近期节点**（第 206-235 行）：`reminderSummary.upcoming` 列表，最多 4 条
  - **最近议事**（第 237-269 行）：`recentMeetings` 列表，最多 3 条
  - **最近故事**（已移除到工具卡片）：`recentStories` 仅用于计数显示
- **当前数据来源**：
  ```
  listTodayFamilyReminders()    → reminderSummary
  listThisWeekFamilyEvents()    → reminderSummary
  listUpcomingFamilyEvents()    → reminderSummary.upcoming
  listFamilyMeetings()          → recentMeetings (slice 0,3)
  listFamilyStories()           → recentStories (filter active, slice 0,3)
  ```
- **是否可升级为独立页面入口**：✅ 可以。现有数据已覆盖 4 个模块，可扩展为独立"家族动态" Tab 页。

## 四、相关模块数据来源梳理

| 模块 | 页面路径 | 数据来源 | service/type | 是否可参与动态聚合 |
| --- | --- | --- | --- | --- |
| 家人/成员 | `/family/members` | `listFamilyMembers` | `member-service.ts` / `PersonProfile` | ✅ `created_at` 字段可用 |
| 家族故事 | `/family/stories` | `listFamilyStories` | `story-service.ts` / `FamilyStory` | ✅ `created_at` + `status:active` |
| 家族相册 | `/family/photos` | `listFamilyPhotos` | `photo-service.ts` / `FamilyPhoto` | ✅ `created_at` + `status:active` |
| 家庭节点/日历/提醒 | `/family/calendar`, `/family/reminders` | `listFamilyCalendarEvents`, `listUpcomingFamilyEvents` | `calendar-service.ts` / `FamilyCalendarEvent` | ✅ `created_at` + `event_date` |
| 家族议事 | `/family/meetings` | `listFamilyMeetings` | `meeting-service.ts` / `FamilyMeeting` | ✅ `created_at` + `status` |
| 成果物 | `/family/output` | `listFamilyOutputs` | `output-service.ts` / `FamilyOutput` | ✅ `created_at` + `status:preview_ready` |
| 数据看板 | `/family/statistics` | `getFamilyStatistics` | `statistics-service.ts` / `FamilyStatistics` | ⚠️ 聚合统计无单条记录 |

## 五、当前是否存在统一 activity 数据模型

- **是否存在**：✅ **存在！`action_logs` 表已在生产中使用**
- **相关文件**：
  - 类型定义：`src/types/domain.ts` (第 139-148 行)
  - 写入 Service：9 个 service 文件均写入 `action_logs`
- **当前状态**：**仅写入，从不读取**
- **ActionLog 结构**：
  ```typescript
  interface ActionLog {
    id: string;
    family_id: string;       // 按家堂隔离
    actor_user_id: string | null;
    target_type: string;     // 如 'family_story', 'family_meeting'
    target_id: string | null;
    action_type: string;     // 如 'create_family_story'
    metadata: Record<string, unknown>;
    created_at: string;      // 时间戳
  }
  ```
- **已记录的 29 种 action_type**：

| 模块 | action_type |
| --- | --- |
| 成员 | `create_person_profile`, `update_person_profile`, `update_person_birthdate`, `claim_person_profile` |
| 关系 | `create_person_relation` |
| 家堂 | `create_family_space`, `update_family_space` |
| 故事 | `create_family_story`, `archive_family_story` |
| 相册 | `create_family_photo`, `archive_family_photo` |
| 议事 | `create_family_meeting`, `update_family_meeting`, `close_family_meeting`, `archive_family_meeting` |
| 投票 | `submit_meeting_vote` |
| 意见 | `create_meeting_opinion`, `update_meeting_opinion`, `hide_meeting_opinion`, `archive_meeting_opinion` |
| 日历 | `create_family_calendar_event`, `update_family_calendar_event`, `archive_family_calendar_event`, `create_person_birthday_event`, `update_person_birthday_event`, `archive_person_birthday_event` |
| 邀请 | `create_invite_token` |
| 成果物 | `create_family_output`, `update_family_output`, `archive_family_output` |

- **是否需要新增数据库**：❌ 不需要。`action_logs` 表已存在且数据持续写入。
- **在"不改数据库"前提下的可行方案**：
  1. **方案 A（推荐）**：新建 `readActionLogs(familyId)` service，读取已有 `action_logs` 表，按 `created_at DESC` 排序
  2. **方案 B（备选）**：前端聚合各模块列表，按各自 `created_at` 排序后合并

## 六、后续"家族动态页面"可行方案

在不改数据库、不改 service、不新增依赖的前提下：

| 功能 | 方案 A（读 action_logs） | 方案 B（前端聚合） | 推荐 |
| --- | --- | --- | --- |
| 纯前端聚合版家族动态页 | ✅ 单次查询 | ✅ 多次查询合并 | 方案 A |
| 首页最近动态增强 | ✅ 替换现有分散展示 | ✅ 扩展现有卡片 | 方案 A |
| 分类筛选 | ✅ WHERE target_type | ✅ 客户端 filter | 方案 A |
| 最近事件时间线 | ✅ 按 created_at 排序 | ✅ 按 created_at 排序 | 方案 A |
| 空状态引导 | ✅ EmptyState 组件 | ✅ EmptyState 组件 | 均可 |
| 跳转到原模块详情页 | ✅ target_id 构造 URL | ✅ 已知路由 | 均可 |

**推荐方案 A 的优势**：
- 单次 Supabase 查询（性能优）
- 统一时间线排序
- 数据结构清晰，易于扩展
- action_logs 表已有 RLS policy（写入时已通过权限校验）
- 不需要新增 migration

## 七、不建议当前做的功能

| # | 功能 | 原因 |
| --- | --- | --- |
| 1 | 新增 activity_logs 表 | 已有 `action_logs`，无需重复 |
| 2 | 新增动态发布功能 | 动态由各模块操作自动产生 |
| 3 | 动态编辑 / 删除 | 无此业务需求 |
| 4 | 即时聊天式动态流 | 产品边界禁止（不做 IM） |
| 5 | 开放社区动态 | 产品边界禁止（不做开放社区） |
| 6 | 支付 / 捐款 / 募捐 | 产品边界禁止 |
| 7 | 祭祀化 / 纪念馆化内容 | 产品边界禁止 |
| 8 | 实时 WebSocket 推送 | 需改架构 |

## 八、当前 UI 组件可复用情况

检查 `src/components/wujia/` 下 7 个组件：

| 组件 | 可用于动态页面？ | 用途 |
| --- | --- | --- |
| `AppShell` | ✅ | 页面外壳 |
| `PageHeader` | ✅ | "家族动态" 标题 |
| `SectionCard` | ✅ | 时间线分组卡片 |
| `QuickActionCard` | ⚠️ | 非必要 |
| `StatusBadge` | ✅ | 动态类型标签 |
| `EmptyState` | ✅ | 无动态时的空状态 |
| `FormPanel` | ⚠️ | 非必要（动态页无表单） |

**结论**：现有 7 个组件中 5 个可直接复用，足够支撑家族动态页面 UI。

## 九、下一步建议

**推荐下一步**：

```
UI-8：创建家族动态页面 /family/activity
```

**允许修改文件**：
- 新增 `src/app/family/activity/page.tsx`
- 可选：`src/lib/services/activity-service.ts`（如果使用方案 A 需要读取 action_logs）

**禁止修改文件**：
- 不修改现有 20 个业务页面
- 不修改数据库 / migration / RLS
- 不修改现有 services（可新增 service 文件，不改已有）

**是否需要改数据库**：❌ 否（`action_logs` 表已存在）

**是否需要新依赖**：❌ 否

**是否适合当前 UI 美化阶段**：✅ 是。纯 UI 页面 + 已有数据源。

**最小版本范围**：
1. 新页面 `/family/activity`
2. 读取 `action_logs`（按 `family_id` 过滤，`created_at DESC` 排序，分页 20 条）
3. 每条动态显示：图标 + 操作描述 + 时间
4. 点击跳转到对应详情页
5. Dashboard 首页加"家族动态"入口
6. 使用 wujia EmptyState 处理空态

## 十、最终结论

1. **当前是否有家族动态基础**：✅ 有。`action_logs` 表已存在且 9 个 service 持续记录 29 种操作类型，只是从未被读取展示。

2. **是否可以不改数据库完成二次开发**：✅ 可以。`action_logs` 表结构完整，只需新增一个查询 service 即可读取已有数据。

3. **下一步最小任务**：新增 `/family/activity` 页面，读取 `action_logs` 表按时间倒序展示，作为家族动态时间线。
