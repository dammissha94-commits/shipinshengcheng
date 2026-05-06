# 首页动态化审计报告

> 审计日期：2026-05-04  
> 不修改任何代码，纯审计。

## 1. 当前首页位置

| 文件 | 类型 | 说明 |
| --- | --- | --- |
| `src/app/family/page.tsx` | 静态图片页 | 仅展示 `home-page.png` + 一个跳转按钮 |
| `src/app/page.tsx` | 静态图片页 | 仅展示 `login-page.png` + 一个跳转按钮 |

当前 `/family` 是纯静态页面，没有任何数据接入。

## 2. 静态图片使用情况

| 图片 | 用途 | 位置 |
| --- | --- | --- |
| `home-page.png` | `/family` 首页 | `public/images/home-page.png` |
| `login-page.png` | `/` 登录页 | `public/images/login-page.png` |
| `home-page-design.png` | 设计参考 | `docs/design/home-page-design.png` |
| `login-page-design.png` | 设计参考 | `docs/design/login-page-design.png` |

## 3. 数据库表与服务映射

| 表 | Service | 可查询函数 | 首页可用？ |
| --- | --- | --- | --- |
| `family_spaces` | family-service | `getCurrentFamilySpace`, `getFamilyDashboardStats` | ✅ |
| `family_memberships` | member-service | `listFamilyMemberships` | ✅ |
| `person_profiles` | person-service | `listFamilyPersons` | ✅ |
| `person_relations` | person-service | `listPersonRelations` | ✅ |
| `invite_tokens` | invite-service | `listPendingInvites` | ✅ |
| `family_stories` | story-service | `listFamilyStories` | ✅ |
| `family_photos` | photo-service | `listFamilyPhotos` | ✅ |
| `family_meetings` | meeting-service | `listFamilyMeetings` | ✅ |
| `family_calendar_events` | calendar-service | `listUpcomingFamilyEvents`, `listTodayFamilyReminders` | ✅ |
| `biography_records` | biography-service | `listBiographyRecords` | ✅ |
| `action_logs` | activity-service | `getFamilyActivityLogs` | ✅ |
| `family_outputs` | output-service | `listFamilyOutputs` | ✅ |

**结论**：所有 12 张表都有对应的只读查询函数，首页动态化数据源完全就绪。

## 4. 已有页面路由

| 路由 | 存在？ | 说明 |
| --- | --- | --- |
| `/family` | ✅ | 当前是静态图片 |
| `/family/tree` | ✅ | 三代谱 |
| `/family/tree/graph` | ✅ | 2D 家族关系图 |
| `/family/members` | ✅ | 成员列表 |
| `/family/members/[id]` | ✅ | 成员详情（含生平时间线） |
| `/family/invite` | ✅ | 邀请认领 |
| `/family/activity` | ✅ | 家族动态 |
| `/family/stories` | ✅ | 家族故事 |
| `/family/photos` | ✅ | 家族相册 |
| `/family/meetings` | ✅ | 议事列表 |
| `/family/calendar` | ✅ | 家族日历 |
| `/family/reminders` | ✅ | 提醒中心 |
| `/family/statistics` | ✅ | 数据看板 |
| `/family/settings` | ✅ | 家堂设置 |

## 5. 首页动态化差距表

### 5.1 设计图中的区域 vs 当前可用的数据

| 设计区域 | 设计元素 | 需要数据 | 已有数据源 | 差距 | 风险 |
| --- | --- | --- | --- | --- | --- |
| 顶部用户区 | 头像+姓名+身份标签+欢迎语 | user.name + family.surname + membership.role | ✅ profiles, family_spaces, memberships | 无风险 |
| 顶部右侧 | 邀请亲属+待认领 | unclaimed persons count | ✅ listFamilyPersons + filter claim_status | 无风险 |
| 祠堂主视觉卡 | 姓氏祠堂+成员数+族人头像 | family + profiles | ✅ 全部已有 | 无风险 |
| 核心功能宫格(6入口) | 家族树/生平传记/相册/纪念/成员/全部 | 路由跳转 | ✅ 全部路由已存在 | 纯前端 |
| 族讯通知条 | 最近一条更新 | latest action_log or story | ✅ activity-service / story-service | 无风险 |
| 家族树预览 | 简版三代树 | person_profiles + relations → mapProfilesToTreePersons | ✅ person-service + family-view.ts | 无风险 |
| 邀请亲人卡片 | 邀请按钮 | 路由跳转 | ✅ /family/invite 已存在 | 纯前端 |
| 家族近况 | 最近故事/照片更新 | recent stories/photos | ✅ listFamilyStories / listFamilyPhotos | 无风险 |
| 底部导航 | 首页/家族树/记录/传记/我的 | 路由跳转 | ✅ 全部路由已存在 | 纯前端 |

### 5.2 详细差距

| # | 差距项 | 严重度 | 说明 |
| --- | --- | --- | --- |
| 1 | 首页完全是静态图片 | **高** | 需从零开始接入数据 |
| 2 | 族讯通知条无后端 | 中 | 可用 latest story 或 activity log 替代 |
| 3 | 家族树预览无数据驱动 | 中 | `mapProfilesToTreePersons` 已就绪 |
| 4 | 已故亲人纪念区缺失 | 中 | 可用 `living_status='deceased'` 过滤 |
| 5 | 家风家训无存储 | 低 | 可 client-state 或后续加字段 |
| 6 | 用户头像无真实图片 | 低 | portrait_url 字段存在但可能为空 |
| 7 | 底部导航需适配路由 | 低 | 纯前端改动 |

## 6. 可复用的已有数据查询

首页动态化需要的所有数据，均可在一次 `useEffect` 中并行加载：

```
Promise.all([
  getCurrentFamilySpace()       // → family 信息
  listFamilyPersons()           // → 成员列表、统计
  listPersonRelations()         // → 家族树关系
  listFamilyStories()           // → 最近故事
  listFamilyPhotos()            // → 最近照片
  listUpcomingFamilyEvents()    // → 近期提醒
])
```

预估：6 路并行查询，Supabase 响应 < 1s。

## 7. 不需要做的

| 项目 | 原因 |
| --- | --- |
| 新增数据库表 | 12 张表现有数据完全够用 |
| 新增 service 函数 | 现有函数已覆盖所有首页需求 |
| 新增 npm 依赖 | 不需要 |
| 新增路由 | 所有目标路由已存在 |
| 改 RLS | 现有 RLS 策略已覆盖查询权限 |

## 8. 升级方案

### 方案：渐进式替换

1. 保留设计图作为视觉基准
2. 逐步将每个区域替换为真实数据驱动组件
3. 每替换一个区域，立即校验

### 建议执行顺序

| 批次 | 区域 | 数据源 | 预计改动 |
| --- | --- | --- | --- |
| 1 | 顶部用户区 | family + profiles | 20 行 |
| 2 | 祠堂主视觉卡 | family + profiles | 15 行 |
| 3 | 核心功能宫格 | 纯路由（无数据） | 静态 JSX |
| 4 | 家族树预览 | profiles + relations | 30 行 |
| 5 | 家族近况 | stories | 15 行 |
| 6 | 底部导航 | 纯路由 | 静态 JSX |
| 7 | 族讯通知 | activity log | 10 行 |
| 8 | 邀请卡片 | 纯路由 | 5 行 |

**总预计改动**：`src/app/family/page.tsx` 约 200 行。

## 9. 风险

| 风险 | 等级 | 应对 |
| --- | --- | --- |
| 数据为空时页面空荡 | 低 | 已有 EmptyState 组件 + 占位引导 |
| 性能退化 | 低 | 6 路并行查询 < 1s |
| 破坏现有路由 | 无 | 只改 page.tsx |
| 破坏认证逻辑 | 无 | 不改 auth |
| 破坏数据库 | 无 | 只读查询 |

## 10. 结论

✅ 首页动态化所有数据源已就绪，所有目标路由已存在，无阻塞条件。

**下一步**：执行 `src/app/family/page.tsx` 的渐进式替换，将静态图片逐步替换为数据驱动的真实页面。
