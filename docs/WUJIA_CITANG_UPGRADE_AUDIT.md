# 吾家祠堂 App — P0 升级审计报告

> 审计日期：2026-05-02  
> 当前分支：main  
> 最新提交：522ddb5 improve family activity timeline experience  
> 工作区状态：干净

---

## 一、仓库状态

| 项目 | 值 |
| --- | --- |
| 分支 | `main` |
| 最新 5 提交 | 522ddb5 → 56457d0 → 43963e4 → 0b4d79f → 231e121 |
| 工作区 | 干净（无未提交变更） |
| 总页面数 | 23 个（含 `/family/activity`） |
| 迁移文件 | 15 个 SQL 文件 |
| 项目名称 | `wujia-citang-app` |
| 技术栈 | Next.js 16.2 + TypeScript + Tailwind CSS + Supabase |

---

## 二、项目结构总览

```
src/
├── app/                          # 23 个路由页面
│   ├── page.tsx                  # 首页（未登录）
│   ├── login/page.tsx            # 登录/注册
│   ├── create/page.tsx           # 创建数字家堂
│   ├── claim/[token]/page.tsx    # 认领邀请
│   ├── auth/callback/page.tsx    # Auth 回调
│   └── family/
│       ├── page.tsx              # 家堂首页 Dashboard
│       ├── activity/page.tsx     # 家族动态
│       ├── members/page.tsx      # 成员列表
│       ├── members/[id]/page.tsx # 家人档案
│       ├── relatives/new/page.tsx# 添加亲属
│       ├── invite/page.tsx       # 邀请认领
│       ├── tree/page.tsx         # 三代谱
│       ├── tree/graph/page.tsx   # 2D 家族关系图
│       ├── stories/page.tsx      # 家族故事
│       ├── photos/page.tsx       # 家族相册
│       ├── meetings/page.tsx     # 议事列表
│       ├── meetings/[id]/page.tsx# 议事详情（含投票）
│       ├── calendar/page.tsx     # 家族日历
│       ├── calendar/[id]/page.tsx# 节点详情
│       ├── reminders/page.tsx    # 提醒中心
│       ├── statistics/page.tsx   # 数据看板
│       ├── output/page.tsx       # 成果物
│       └── settings/page.tsx     # 家堂设置
├── components/
│   ├── wujia/                    # 7 个可复用 UI 组件
│   ├── ui/                       # 6 个基础 UI 组件
│   ├── genealogy/graph/          # D3 图谱组件
│   └── AppHeader, EmptyState, ... # 页面组件
├── lib/
│   ├── auth/                     # auth-service, permission-service, redirect
│   ├── services/                 # 15 个 service 文件
│   ├── supabase/                 # client.ts
│   ├── kinship/                  # kinship-adapter.ts
│   ├── genealogy/                # graph-adapter, graph-utils
│   ├── family-view.ts            # 三代谱映射
│   └── family-completion.ts      # 完整度计算
└── types/
    ├── domain.ts                 # 领域类型
    └── service.ts                # Service 类型
```

---

## 三、P0 模块现状映射

### 3.1 数字化祠堂核心模块

| 功能 | 现有状态 | 覆盖度 |
| --- | --- | --- |
| 姓氏祠堂首页 | `/create` 可创建，`/family` 是 Dashboard | 80% |
| 家风家训 | ❌ 不存在 | 0% |
| 家族荣耀墙 | ❌ 不存在 | 0% |
| 已故亲人生平纪念 | ⚠️ `living_status='deceased'` 可标记，但无专门纪念页 | 30% |
| 上香/祭拜/功德 | ✅ 已禁止（产品边界） | 合规 |

### 3.2 家族树与裂变核心模块

| 功能 | 现有状态 | 覆盖度 |
| --- | --- | --- |
| 创建姓氏祠堂 | `/create` 页面，支持姓氏+姓名+性别+出生年份 | 100% |
| 录入直系亲属 | `/family/relatives/new`，支持 6 种关系类型 | 100% |
| 生成家族树 | `/family/tree` 三代谱 + `/family/tree/graph` D3 图谱 | 100% |
| 待认领节点状态 | `claim_status` 字段存在（claimed/unclaimed/disputed） | 90% |
| 一键邀请认领 | `/family/invite` 生成 token + 复制文案 | 100% |
| 被邀请人注册绑定 | `/claim/[token]` 认领流程完整 | 100% |
| 入驻后补充亲属 | ✅ 认领后即可添加亲属 | 100% |
| 二次裂变闭环 | ✅ 核心链路完整 | 85% |

### 3.3 家族成员生平传记模块

| 功能 | 现有状态 | 覆盖度 |
| --- | --- | --- |
| 本人生平资料 | `/family/members/[id]` 可编辑 display_name/gender/birth/death/bio | 70% |
| 亲属授权代录 | ⚠️ 管理员/bound_user 可编辑，但无明确"授权代录" UI 提示 | 40% |
| 已故亲人生平纪念 | ⚠️ 可标记 deceased，无专门纪念页 | 30% |
| 文字/图片时间线 | ❌ 不存在（故事/相册独立于人物） | 0% |
| 生平资料绑定人物 | ⚠️ bio 字段绑定，但故事/相册不绑定 | 30% |
| 私密/家族可见 | ✅ `visibility` 字段存在 | 80% |

### 3.4 家族联结互动模块

| 功能 | 现有状态 | 覆盖度 |
| --- | --- | --- |
| 家族通知 | ❌ 不存在 | 0% |
| 生日/纪念日提醒 | ✅ `/family/reminders` + `/family/calendar` | 100% |
| 亲情留言 | ⚠️ 议事意见区可充当，但不是设计目标 | 20% |
| IM 聊天 | ✅ 已禁止（产品边界） | 合规 |
| 朋友圈/动态广场 | ✅ 已禁止（产品边界） | 合规 |

### 3.5 个人中心与权限设置

| 功能 | 现有状态 | 覆盖度 |
| --- | --- | --- |
| 隐私设置 | ⚠️ 可见范围可选，但无细粒度隐私控制 | 40% |
| 亲属权限管理 | ⚠️ 五级角色（owner/admin/memory_admin/member/viewer） | 60% |
| 长辈模式 | ⚠️ `elder_mode` 字段存在但 **无 UI 切换** | 0% |
| 账号注销 | ❌ 不存在 | 0% |
| 数据删除/隐藏/更正 | ⚠️ 编辑/归档存在，无"删除账号"流程 | 20% |

---

## 四、合规红线审计

### 4.1 非本人亲属信息保护

| 要求 | 当前状态 | 合规？ |
| --- | --- | --- |
| 可录入姓名/称谓/关系 | ✅ 添加亲属表单支持 | ✅ |
| 不得默认公开手机号 | ✅ 无手机号字段 | ✅ |
| 不得默认公开详细地址 | ✅ 无地址字段 | ✅ |
| 不得默认公开完整生日 | ⚠️ 添加亲属时可选出生年份，不区分精确度 | ⚠️ |
| 详细资料需本人完善或授权 | ⚠️ `bound_user_id` 机制存在但 UI 无明确授权提示 | ⚠️ |

### 4.2 在世亲属认领机制

| 要求 | 当前状态 | 合规？ |
| --- | --- | --- |
| 待认领/已认领 | ✅ `claim_status` 完整 | ✅ |
| 已拒绝 | ❌ 不存在 | ❌ |
| 已隐藏 | ❌ 不存在 | ❌ |
| 被邀请人看到邀请信息 | ✅ `/claim/[token]` 展示家堂+姓名 | ✅ |
| 被邀请人看到信息可见范围 | ⚠️ 无明确展示 | ⚠️ |
| 被邀请人可拒绝 | ❌ 无拒绝按钮 | ❌ |

### 4.3 未成年人保护

| 要求 | 当前状态 | 合规？ |
| --- | --- | --- |
| 未成年人节点隐藏详细资料 | ❌ 无年龄判断 | ❌ |
| 14 岁以下需监护人授权 | ❌ 无监护人机制 | ❌ |
| 不公开展示未成年人照片 | ❌ 无限制 | ❌ |

### 4.4 已故亲人管理

| 要求 | 当前状态 | 合规？ |
| --- | --- | --- |
| 可记录生平 | ✅ bio 字段存在 | ✅ |
| 不做祭祀 | ✅ 产品边界已禁止 | ✅ |
| 近亲属可申请更正/隐藏/删除 | ⚠️ 管理员/bound_user 可编辑，无申请流程 | ⚠️ |
| 不做网上灵堂/功德 | ✅ 产品边界已禁止 | ✅ |

### 4.5 权限最小化

| 要求 | 当前状态 | 合规？ |
| --- | --- | --- |
| 普通成员不查全族资料 | ✅ RLS 限制 family_id 范围 | ✅ |
| 分支成员优先只看分支 | ❌ 无分支概念 | ❌ |
| 管理员不能无授权看隐私 | ⚠️ 管理员可查看所有 family 数据 | ⚠️ |
| 操作日志 | ✅ `action_logs` 表 + 29 种 action_type | ✅ |

---

## 五、适老化审计

| 要求 | 当前状态 | 合规？ |
| --- | --- | --- |
| 大字体 | ❌ 无 UI 切换，`elder_mode` 字段闲置 | ❌ |
| 大按钮 | ⚠️ 已有 `h-11`/`h-12` 按钮，但无独立模式 | ⚠️ |
| 一页只做一件事 | ⚠️ Dashboard 信息密度较高 | ⚠️ |
| 无复杂弹窗 | ✅ 无弹窗 | ✅ |
| 操作不超 3 步 | ⚠️ 添加亲属需多步（选择关系→填表→保存） | ⚠️ |
| 长辈模式入口 | ❌ 不存在 | ❌ |
| 语音/图片优先 | ❌ 无语音录入，仅文字 | ❌ |
| 亲属协助代录 | ⚠️ 管理员可编辑，但无独立"代录模式" | ⚠️ |

---

## 六、差距分析表

| 现有功能 | 是否满足 P0 | 缺口 | 风险等级 | 建议改造动作 | 涉及文件 |
| --- | --- | --- | --- | --- | --- |
| 邮箱注册登录 | ✅ | — | 低 | — | — |
| 创建数字家堂 | ✅ | 可增加"姓氏祠堂"品牌化命名 | 低 | 文案调整 | `create/page.tsx` |
| 家族树展示 | ✅ | — | 低 | — | — |
| 邀请认领闭环 | ✅ | 缺少"拒绝"操作 | **高** | 增加拒绝认领按钮 + 状态 | `claim/page.tsx`, `invite-service.ts` |
| 亲属关系录入 | ✅ | 缺少生日精确度控制 | 中 | 增加"仅年份/完整日期"选项 | `members/[id]/page.tsx` |
| 已故成员标记 | ⚠️ | 无专门纪念页，无管理人权责 | **高** | 新增已故纪念页 + 管理人机制 | 新页面 + `member-service.ts` |
| 生平传记 | ⚠️ | bio 过于简单，无时间线 | 中 | 增加生平时间线组件 | `members/[id]/page.tsx` |
| 家风家训 | ❌ | 完全缺失 | 中 | 新增祠堂内容模块 | `family/page.tsx` |
| 家族荣耀墙 | ❌ | 完全缺失 | 低 | Dashboard 模块 | `family/page.tsx` |
| 亲情留言 | ❌ | 完全缺失 | 中 | 轻量留言板（非 IM） | 新页面 |
| 家族通知 | ❌ | 完全缺失 | 中 | 基于 action_logs 推送 | 新页面 |
| 长辈模式 | ❌ | `elder_mode` 字段闲置 | **高** | 实现大字体/大按钮切换 | `settings/page.tsx`, 全局 CSS |
| 账号注销 | ❌ | 完全缺失 | **高** | 新增注销流程 | `settings/page.tsx`, `auth-service.ts` |
| 数据删除入口 | ❌ | 完全缺失 | 中 | 增加删除/隐藏操作 | `members/[id]/page.tsx` |
| 未成年人保护 | ❌ | 无年龄判断/监护人 | 中 | 增加出生年份→年龄计算 | 前端逻辑 |
| 已拒绝认领 | ❌ | claim_status 缺少 'rejected' | 中 | 扩展状态枚举 | 后端 + 前端 |
| 分支权限隔离 | ❌ | 无分支概念 | 低 | P1 再做 | — |
| 代录授权 UI | ⚠️ | 管理员可编辑但无提示 | 中 | 增加代录模式提示 | `members/[id]/page.tsx` |
| 生日精确度 | ⚠️ | 部分字段存在但未启用 | 低 | 启用 birth_month/birth_day | `members/[id]/page.tsx` |

---

## 七、分级改造计划

### P0-A：必须先修（阻断裂变闭环）

| # | 任务 | 说明 | 涉及文件 | 是否需改 DB |
| --- | --- | --- | --- | --- |
| P0-A1 | 拒绝认领功能 | `/claim/[token]` 增加"拒绝认领"按钮 + claim_status 新增 'rejected' | claim/page.tsx, invite-service.ts | ⚠️ 新增 status 值 |
| P0-A2 | 长辈模式 UI | 利用现有 `elder_mode` 字段，实现大字体/大按钮切换 | settings/page.tsx, globals.css | 否 |
| P0-A3 | 账号注销流程 | 新增注销按钮 + 确认 + 数据清理 | settings/page.tsx, auth-service.ts | 否（soft delete） |
| P0-A4 | 已故成员纪念页 | `/family/members/[id]` 根据 living_status 切换纪念模式 | members/[id]/page.tsx | 否 |

### P0-B：必须做（完善闭环体验）

| # | 任务 | 说明 | 涉及文件 | 是否需改 DB |
| --- | --- | --- | --- | --- |
| P0-B1 | 代录授权提示 | 编辑非本人档案时显示"代录模式"说明 | members/[id]/page.tsx | 否 |
| P0-B2 | 家风家训 | Dashboard 增加可编辑的家风家训卡片 | family/page.tsx | ⚠️ 可选新字段 |
| P0-B3 | 生平时间线 | 以出生年为起点的时间线组件 | members/[id]/page.tsx | 否 |
| P0-B4 | 邀请信息增强 | 被邀请人看到更多上下文（谁邀请、信息可见范围） | claim/page.tsx | 否 |
| P0-B5 | 未成年人标识 | 根据出生年份自动标记未成年，隐藏敏感字段 | members/[id]/page.tsx, 前端逻辑 | 否 |

### P1：体验增强（MVP 可延后）

| # | 任务 | 说明 |
| --- | --- | --- |
| P1-1 | 家族荣耀墙 | Dashboard 增加成员里程碑卡片 |
| P1-2 | 亲情留言板 | 轻量留言（非 IM），每人一页 |
| P1-3 | 家族通知中心 | 基于 action_logs 的未读提醒 |
| P1-4 | 语音录入支持 | PWA + Web Speech API |
| P1-5 | 分支权限 | 家族分支概念 + 分支级权限 |
| P1-6 | 批量邀请 | 一键为所有待认领成员生成邀请 |

### P3：禁止做或暂不做

| # | 内容 | 原因 |
| --- | --- | --- |
| P3-1 | 3D 虚拟祠堂 | 偏离裂变闭环 |
| P3-2 | IM 聊天 | 产品边界禁止 |
| P3-3 | 公开社区/动态广场 | 产品边界禁止 |
| P3-4 | 上香/祭拜/功德 | 产品边界禁止 |
| P3-5 | AI 生成回忆录 | MVP 不需要 |
| P3-6 | GEDCOM 导入 | 偏离轻量裂变 |
| P3-7 | 支付/红包/积分 | 产品边界禁止 |
| P3-8 | Flutter 重写 | 当前 Next.js 架构成熟 |

---

## 八、开发边界

### 可以改的文件
- `src/app/family/settings/page.tsx` — 长辈模式开关 + 注销入口
- `src/app/claim/[token]/page.tsx` — 拒绝认领按钮
- `src/app/family/members/[id]/page.tsx` — 代录提示 + 生平时间线 + 纪念页
- `src/app/family/page.tsx` — 家风家训 + 荣耀墙
- `src/app/globals.css` — 长辈模式全局样式
- `src/lib/services/invite-service.ts` — 拒绝认领状态更新
- `src/lib/auth/auth-service.ts` — 注销逻辑

### 暂不动的文件
- `src/lib/services/` 下所有非目标文件
- `src/types/domain.ts` — 除新增 claim_status 值外
- `src/components/` 下所有 UI 组件
- 所有 migration 文件（除非 P0-A1 需要新增 status）

### 是否需要新增 migration
- P0-A1 可能需要：如果 `claim_status` 有 CHECK 约束限制值
- 其余 P0-A/B 全部不需要

### 是否有破坏测试数据风险
- P0-A1：仅增加状态值，不删除数据 ✅
- P0-A3：建议 soft delete（标记 inactive，不物理删除）✅
- 其余任务：纯 UI 改动，零数据风险 ✅

---

## 九、立即开始的最小任务

建议从 **P0-A2 长辈模式** 开始，因为：
1. `elder_mode` 字段已存在 → 不改 DB
2. 仅需 settings 加一个开关 + 全局 CSS 变量 → 最小改动
3. 对高龄用户价值最大
4. 完成后立即可在预览中验证

```
任务：实现长辈模式 UI
文件：src/app/family/settings/page.tsx + src/app/globals.css
不改：DB / RLS / services / types
预计改动：+40 行
```

---

## 附录：现有数据模型核心表

| 表 | 关键字段 | 行级安全 |
| --- | --- | --- |
| `profiles` | id, display_name, elder_mode | ✅ RLS |
| `family_spaces` | id, surname, display_name, visibility | ✅ RLS |
| `family_memberships` | family_id, user_id, role | ✅ RLS |
| `person_profiles` | family_id, bound_user_id, claim_status, living_status | ✅ RLS |
| `person_relations` | family_id, from_person_id, to_person_id, relation_type | ✅ RLS |
| `invite_tokens` | family_id, token, status | ✅ RLS |
| `action_logs` | family_id, action_type, target_type, target_id | ✅ RLS |
| `family_stories` | family_id, title, content, visibility | ✅ RLS |
| `family_photos` | family_id, title, image_url | ✅ RLS |
| `family_meetings` | family_id, title, meeting_type, status | ✅ RLS |
| `family_calendar_events` | family_id, event_type, recurrence | ✅ RLS |
| `family_outputs` | family_id, output_type, preview_data | ✅ RLS |
