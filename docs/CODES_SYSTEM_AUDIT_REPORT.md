# 吾家祠堂 APP 系统审计报告

审计时间：2026-05-06

审计范围：本轮只读取本地代码与文档，不修改业务代码，不修改数据库，不新增依赖，不连接或修改 Supabase 远程配置。

## 一、当前系统现状总览

当前项目不是完全混乱，已经形成了一个可运行的数字家堂 MVP，并覆盖了主要产品闭环：

注册/登录、创建姓氏家堂、录入亲属、三代谱、2D 关系图、邀请认领、成员档案、生平记录、故事、相册、日历、提醒、议事、投票、数据看板、成果物、家堂设置、长辈模式。

但系统已经出现明显的“快速迭代后治理债务”：

- 核心闭环存在，但“注册/登录”页面文案与真实实现不一致：页面写手机号/验证码/登录注册，但服务实际是邮箱密码登录，且页面只调用 `signInWithEmail()`，没有调用 `signUpWithEmail()`。
- migration 历史较乱：同日存在多份核心 schema、`z` 后缀补丁、重复内容模块、后置 P0 修复 migration，后续新环境初始化风险较高。
- 数据库与 TypeScript 类型已有不一致：`person_profiles.claim_status` migration 后支持 `rejected` / `hidden`，但 `ClaimStatus` 类型仍只有 `unclaimed | claimed | disputed`，代码里通过强制类型绕过。
- UI 已经部分统一到暖色调，但大量 Tailwind class 写成 `bg-#5A3524`、`text-#8D6E63`、`focus:border-#8B5A3C`，这不是标准 Tailwind 语法，应为 `bg-[#5A3524]` 等。该问题会造成部分样式不生效。
- 页面中存在静态图片落地页与动态业务页面混用：`/` 使用静态图片风格入口，`/family` 是动态家堂首页，两者视觉和信息架构需要统一。
- 服务层总体清晰，但 `family-life-service.ts` 更像聚合封装，目前未被页面直接引用；`settings/page.tsx` 直接操作 Supabase profile，不走专门 service，破坏服务层边界。
- 合规方向大体可控，未发现支付、IM、开放社区、商城、排行榜、祭祀功能链路。但存在“纪念日 / memorial_day”命名，容易滑向纪念馆或祭祀化语境，应收敛为家庭节点或家庭纪念节点，不做祭祀表达。

总体判断：

- 当前系统没有崩坏。
- 核心闭环已有，但注册实现、类型/schema 对齐和 migration 治理必须优先处理。
- 本轮不建议继续新增功能。
- 下一步应只做 P0-A 核心闭环与一致性修复。

## 二、核心闭环检查表

| 模块 | 是否存在 | 是否可用 | 主要问题 | 风险等级 |
| --- | --- | --- | --- | --- |
| 注册/登录 | 存在 | 部分可用 | `/login` 页面文案是手机号/验证码/登录注册，但代码只调用邮箱密码 `signInWithEmail()`，没有实际注册调用 | P0-A |
| 创建姓氏祠堂 | 存在 | 可用 | `/create` 已走 `createFamilySpace()`，但“祠堂/家堂”命名需统一 | P1 |
| 录入本人/亲属 | 存在 | 可用 | `/family/relatives/new` 支持亲属添加；关系模型可用 | P1 |
| 生成家族树 | 存在 | 可用 | `/family/tree` 可展示三代谱；复杂关系推断仍保守 | P2 |
| 2D 家族关系图 | 存在 | 可用 | `/family/tree/graph` 可搜索/筛选/高亮；部分样式 class 非标准 Tailwind | P1 |
| 邀请亲属认领 | 存在 | 可用 | `/family/invite` 和 `/claim/[token]` 存在；新增 reject 状态与 TS 类型不一致 | P0-A |
| 被邀请人注册并认领节点 | 存在 | 部分可用 | 认领页存在，但注册入口与登录页实现不一致，可能影响新用户闭环 | P0-A |
| 补充生平传记 | 存在 | 可用 | `biography_records` 与成员详情页已接入；需要保护未成年人和敏感信息 | P1 |
| 继续补充亲属 | 存在 | 可用 | claim 成功页有继续添加亲属入口 | P1 |
| 二次裂变 | 存在 | 可用 | 邀请认领可支撑裂变；需确保被邀请新账号可完整注册 | P0-A |

## 三、页面路由检查表

| 路由 | 文件路径 | 当前作用 | 是否重复 | 是否建议保留 |
| --- | --- | --- | --- | --- |
| `/` | `src/app/page.tsx` | 静态视觉入口，跳转登录 | 否，但与动态首页风格割裂 | 保留，但需后续统一为真实产品首页 |
| `/login` | `src/app/login/page.tsx` | 登录入口 | 否 | 保留，优先修正文案与注册逻辑 |
| `/auth/callback` | `src/app/auth/callback/page.tsx` | Supabase Auth 回调 | 否 | 保留 |
| `/create` | `src/app/create/page.tsx` | 创建姓氏家堂 | 否 | 保留 |
| `/family` | `src/app/family/page.tsx` | 家族首页/数字家堂首页 | 否 | 保留，作为核心首页 |
| `/family/activity` | `src/app/family/activity/page.tsx` | 家族动态/操作日志时间线 | 否 | 保留，但属于 P2，不应扩展成开放社区 |
| `/family/tree` | `src/app/family/tree/page.tsx` | 三代谱 | 否 | 保留 |
| `/family/tree/graph` | `src/app/family/tree/graph/page.tsx` | 2D 家族关系图 | 否 | 保留 |
| `/family/members` | `src/app/family/members/page.tsx` | 成员列表 | 否 | 保留 |
| `/family/members/[id]` | `src/app/family/members/[id]/page.tsx` | 成员详情、生日、传记、生平记录 | 否 | 保留 |
| `/family/relatives/new` | `src/app/family/relatives/new/page.tsx` | 添加亲属 | 否 | 保留 |
| `/family/invite` | `src/app/family/invite/page.tsx` | 邀请亲属认领 | 否 | 保留 |
| `/claim/[token]` | `src/app/claim/[token]/page.tsx` | 被邀请人认领节点 | 否 | 保留 |
| `/family/stories` | `src/app/family/stories/page.tsx` | 家族故事/生平记忆 | 与成员传记有内容边界重叠 | 保留，后续明确“故事 vs 传记”边界 |
| `/family/photos` | `src/app/family/photos/page.tsx` | 家族相册 | 否 | 保留 |
| `/family/meetings` | `src/app/family/meetings/page.tsx` | 家族议事列表 | 否 | 保留 |
| `/family/meetings/[id]` | `src/app/family/meetings/[id]/page.tsx` | 议事详情、投票、意见区 | 否 | 保留 |
| `/family/output` | `src/app/family/output/page.tsx` | 成果物预览/生成 | 否 | 保留，后续做 P2 性能优化 |
| `/family/calendar` | `src/app/family/calendar/page.tsx` | 家族日历/家庭节点 | 否 | 保留 |
| `/family/calendar/[id]` | `src/app/family/calendar/[id]/page.tsx` | 家庭节点详情 | 否 | 保留 |
| `/family/reminders` | `src/app/family/reminders/page.tsx` | 提醒中心 | 否 | 保留 |
| `/family/statistics` | `src/app/family/statistics/page.tsx` | 数据看板 | 否 | 保留 |
| `/family/settings` | `src/app/family/settings/page.tsx` | 家堂设置、长辈模式、账号说明 | 否 | 保留，建议抽出 profile service |
| 个人中心 | 未发现独立路由 | 当前只在设置页承载部分账号能力 | 缺失 | P2：暂不新建，先不扩大范围 |
| 长辈模式 | `src/app/family/settings/page.tsx` + `globals.css` | 设置页开关 + 全局 CSS | 否 | 保留 |

## 四、组件与服务检查表

| 文件 | 当前作用 | 是否重复 | 是否建议保留 | 风险说明 |
| --- | --- | --- | --- | --- |
| `src/components/AppHeader.tsx` | 通用顶部栏 | 否 | 保留 | 大多数页面依赖 |
| `src/components/ui/*` | 基础 UI 组件 | 与 `components/wujia/*` 有部分重叠 | 保留 | 后续应统一组件入口 |
| `src/components/wujia/*` | 新版暖色调 UI 组件 | 与旧 `EmptyState`、`Card`、`PrimaryButton` 有重叠 | 保留 | P1：逐步统一，不要一次性重构 |
| `src/components/PersonNodeCard.tsx` | 旧树节点卡片 | 可能与 `tree/page.tsx` 内部节点实现重叠 | 暂留 | P2：确认是否仍被使用后再处理 |
| `src/components/genealogy/graph/*` | 2D 图谱渲染、边、节点、PNG 导出 | 否 | 保留 | 图谱算法独立，后续慎改 |
| `src/lib/services/family-service.ts` | 家堂创建、设置、统计入口 | 否 | 保留 | 核心服务 |
| `src/lib/services/person-service.ts` | 亲属节点与关系写入 | 否 | 保留 | 核心闭环服务 |
| `src/lib/services/member-service.ts` | 成员列表/详情/生日资料 | 与 person-service 边界接近 | 保留 | P1：后续明确“person 写入 vs member 展示/编辑” |
| `src/lib/services/invite-service.ts` | 邀请、认领、拒绝 | 否 | 保留 | P0-A：`rejected` 强制类型说明类型未同步 |
| `src/lib/services/biography-service.ts` | 生平传记记录 | 否 | 保留 | P1：敏感内容与未成年人保护需审计 |
| `src/lib/services/story-service.ts` | 家族故事 | 与 biography 内容边界接近 | 保留 | P2：明确故事/传记边界 |
| `src/lib/services/photo-service.ts` | 相册记录 | 否 | 保留 | P1：storage bucket 当前 public read，需合规评估 |
| `src/lib/services/calendar-service.ts` | 家庭节点、生日同步、提醒 | 否 | 保留 | P1：包含 `memorial_day` label，需收敛语义 |
| `src/lib/services/meeting-service.ts` | 议事、投票、意见 | 否 | 保留 | 当前可用，继续限制为家庭内部议事 |
| `src/lib/services/output-service.ts` | 成果物预览 | 否 | 保留 | P2：已知性能观察项 |
| `src/lib/services/statistics-service.ts` | 数据看板统计 | 否 | 保留 | P2：统计项解释性不足 |
| `src/lib/services/activity-service.ts` | 家族动态日志 | 否 | 保留 | 不应发展成开放社区 |
| `src/lib/services/family-life-service.ts` | 故事/照片/议事聚合 facade | 是，当前页面未直接引用 | 暂留 | P2：可能是未使用服务，后续确认后决定 |
| `src/lib/supabase/client.ts` | Supabase browser client | 否 | 保留 | `createSupabaseServiceClient` 命名易误导，实际不是 service_role |
| `src/lib/supabase/server.ts` | Server Supabase client | 否 | 保留 | 当前 App Router 页面多为 client page，使用较少 |
| `src/lib/kinship/*` | 中文亲属称谓适配层 | 否 | 保留 | adapter 边界合理 |
| `src/lib/genealogy/*` | 2D 图谱数据、布局、工具 | 否 | 保留 | 后续接 family-chart 前先做 license 评估 |

## 五、数据库与 migration 检查表

| 文件 | 当前作用 | 是否存在风险 | 是否建议修改 |
| --- | --- | --- | --- |
| `202604290001_create_family_core_schema.sql` | 早期核心 schema | 高：与 `20260429_init_wujia_citang_core.sql` 重复建核心表 | 不立即改生产历史；建议新增 schema baseline 文档 |
| `20260429_init_wujia_citang_core.sql` | 核心 schema、RLS、policy | 中：与 0001 文件重复，后续本地初始化易混淆 | 暂不改；先审计执行顺序 |
| `20260429_create_family_space_rpc.sql` | 创建家堂 RPC | 中：前端当前走 service 插入，RPC 是否仍必要需确认 | 暂留 |
| `20260429_invite_claim_flow.sql` | 邀请认领 RPC | 低：核心闭环需要 | 保留 |
| `20260429z_fix_p0_p1.sql` | 早期 P0/P1 修复 | 中：`z` 后缀破坏规范命名 | 不改历史；后续文档记录 |
| `20260430_family_content_modules.sql` | 故事/相册/议事等内容模块 | 中：与 `20260430z_family_content_modules.sql` 重叠 | 暂留，需审计重复 policy |
| `20260430z_family_content_modules.sql` | 内容模块补丁/重建 policy | 中：重复内容模块，命名不规范 | 不改历史；后续只新增清晰 migration |
| `20260430_family_calendar_events.sql` | 家庭日历表 | 中：后续 blocker migration 又 create if not exists 并补列 | 暂留 |
| `20260430_family_life_cloud.sql` | 家庭生活云/聚合模块 | 中：与故事/照片/议事边界需要核实 | 暂留 |
| `20260430_family_meeting_opinions.sql` | 议事意见表 | 中：后续 blocker migration 再次 create/alter | 暂留 |
| `20260430_family_outputs.sql` | 成果物表 | 低：当前页面使用 | 保留 |
| `20260430_fix_person_self_edit_birthdate.sql` | 生日编辑修复 | 低 | 保留 |
| `20260430_fix_visibility_rls.sql` | visibility RLS 修复 | 中：RLS 高风险，需单独回归审计 | 暂留 |
| `20260430_person_birthdate_calendar_sync.sql` | 生日同步家庭日历 | 低 | 保留 |
| `20260501_fix_real_test_blockers.sql` | 真实测试 blocker 修复 | 高：同一文件包含 create table、alter、policy、约束、补字段，职责过重 | 不改历史；后续拆分新 migration |
| `20260503_p0a_claim_status_enhance.sql` | claim_status 支持 reject/hidden | 高：数据库支持 `rejected/hidden`，TS `ClaimStatus` 未同步 | 建议第一批修复类型对齐 |
| `20260503_p0b_biography_records.sql` | 生平传记记录 | 中：合规和可见性需审计 | 暂留 |
| `20260503_p0c_photo_upload_storage.sql` | 相册 Storage bucket 与 policy | 高：bucket public read，家庭私密相册定位需复核 | 建议第二批做 RLS/Storage 审计 |

## 六、问题分级

### P0-A：不修无法运行或无法形成核心闭环

| 问题 | 影响 | 建议 |
| --- | --- | --- |
| 登录/注册页面没有实际注册调用 | 新被邀请亲属可能无法完成“注册并认领节点”闭环 | 第一优先修复：明确邮箱密码登录/注册，或真正接入手机号登录；不要保留虚假手机号文案 |
| `ClaimStatus` 类型与 DB 不一致 | `rejected/hidden` 状态只能靠强制类型绕过，后续页面可能显示/筛选错误 | 同步 `ClaimStatus`、相关 label、过滤、图谱标签 |
| migration 历史重复且含多份核心 schema | 新环境初始化和手工执行 SQL 易冲突 | 不改历史文件，新增 `SCHEMA_BASELINE_AUDIT.md` 或整理执行顺序文档 |

### P0-B：必须修，但可第二批

| 问题 | 影响 | 建议 |
| --- | --- | --- |
| 大量 `bg-#...` / `text-#...` 非标准 Tailwind 类 | UI 统一工作可能实际未生效，移动端/视觉表现不稳定 | 统一改为 `bg-[#...]` 等合法类，或抽 CSS 变量 |
| `createSupabaseServiceClient` 命名误导 | 容易误以为用了 service_role；页面也有直接 client 操作 | 改名为 browser data client 或统一 service 层封装 |
| 相册 Storage bucket public read | 私密家庭相册定位与 public bucket 存在张力 | 单独做 Storage/RLS 合规审计 |
| `memorial_day` / “纪念日”命名 | 容易滑向纪念馆或祭祀化方向 | 改为家庭节点/家庭纪念节点，不做祭祀表达 |

### P1：体验优化

| 问题 | 影响 | 建议 |
| --- | --- | --- |
| 静态图入口与动态家堂首页视觉割裂 | 用户首屏体验不一致 | 后续统一首页设计语言 |
| 组件体系存在 `ui`、`wujia`、旧组件三套并存 | 开发维护成本上升 | 不大重构，逐页迁移 |
| 成员传记与家族故事内容边界不清 | 用户不知道写在哪里 | 文案区分：个人生平 vs 家族共同记忆 |
| 数据看板统计项解释不足 | 用户理解成本高 | 增加说明文案，不新增统计功能 |
| `/family/output` 性能仍是观察项 | 成果物页体验慢 | 后续按 A4 排序做性能优化 |

### P2：后续迭代

| 问题 | 影响 | 建议 |
| --- | --- | --- |
| `family-life-service.ts` 暂未直接使用 | 可能是保留聚合层 | 观察后决定是否保留 |
| 个人中心无独立路由 | 账号能力集中在设置页 | 后续再做，不影响当前闭环 |
| 2D 图谱体验可继续增强 | 当前可用但仍可优化 | family-chart 先做 License 核验，不直接接入 |
| 中文亲属称谓仍需人工样本校对 | 真实家庭语境复杂 | 先做样本文档，不改代码 |

### P3：禁止做或暂不做

| 事项 | 原因 |
| --- | --- |
| 支付、商城、募捐、捐款 | 偏离当前定位 |
| IM、开放社区、陌生人社交 | 偏离家庭私域闭环 |
| 祭祀化、宗教化、上香供奉、功德、法事、数字牌位 | 明确禁止方向 |
| 3D 图谱 | 当前图谱已可用，3D 会增加复杂度 |
| 大范围 UI 重构 | 真实测试刚通过，应避免扰动 |
| 直接接入 family-chart | License 与适配风险未完成核验 |

## 七、建议修复顺序

只给一个顺序，不并行开多个方向：

1. 修复注册/登录真实闭环。
2. 同步 `ClaimStatus` 类型、label、页面展示与 DB 状态。
3. 整理 migration 执行现状文档，标记重复 schema 和不可手工乱跑的文件。
4. 修复 Tailwind 非法颜色 class，确保 P0-A UI 统一真实生效。
5. 收敛 `createSupabaseServiceClient` 命名和页面直连 Supabase 的例外点。
6. 做 Storage/RLS 合规审计，特别是家庭相册 public read。
7. 统一“家堂/祠堂/数字祠堂”的产品文案边界，弱化纪念/祭祀联想。
8. 再进入 `/family/output` 性能优化。

## 八、下一步唯一建议动作

下一步唯一建议动作：

第四阶段 B0：修复注册/登录真实闭环与 claim 状态类型一致性。

执行边界：

- 不新增功能方向。
- 不接入手机号短信。
- 不接入微信登录。
- 不改数据库结构，除非确认必须补一个最小 migration。
- 先修页面文案与真实能力一致：如果当前只支持邮箱密码，就显示邮箱密码登录/注册。
- 让 `/login?redirect=/claim/[token]` 能支撑被邀请亲属完成注册/登录后回到认领流程。
- 同步 `ClaimStatus` 类型到 `rejected` / `hidden`，并补齐页面 label fallback。

不要优先做：

- family-chart。
- 3D 图谱。
- 新 UI 大改。
- 支付/IM/开放社区。
- 祭祀化、宗教化、纪念馆化功能。
