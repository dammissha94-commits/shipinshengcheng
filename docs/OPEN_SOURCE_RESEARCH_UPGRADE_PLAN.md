# 吾家祠堂 App 开源项目研究与功能升级方案

## 1. 当前 App 已有能力清单

| 模块 | 已有功能 | 技术实现 |
| --- | --- | --- |
| **认证** | 邮箱注册/登录、Supabase Auth、Session 管理 | `@supabase/ssr` |
| **家堂管理** | 创建数字家堂、设置名称/可见范围、成员统计 | `family-service.ts` |
| **家人档案** | 成员列表、搜索、筛选、档案详情、编辑、称谓 | `member-service.ts` |
| **关系管理** | 添加亲属（父子/配偶/兄弟姐妹/祖孙）、关系图谱 | `person-service.ts` |
| **三代谱** | 祖辈/父辈/本人/同辈/子女五层树形展示 | `family-view.ts` |
| **2D 家族关系图** | 搜索、筛选、高亮、PNG 导出、Drag/Zoom | `genealogy/graph/` |
| **中文称谓** | relationship-ts adapter、页面级称谓展示 | `kinship/` |
| **邀请认领** | 生成 token、复制邀请文案、认领闭环 | `invite-service.ts` |
| **家族故事** | 创建故事、标题/正文/年份/关联人物 | `story-service.ts` |
| **家族相册** | 创建照片记录、标题/说明/年份/图片 URL | `photo-service.ts` |
| **家族议事** | 创建议题、投票（同意/不同意/待商量）、意见区 | `meeting-service.ts` |
| **家族日历** | 新增节点、生日/纪念日/聚会/事项、提醒（D-7/D-1/当天）、yearly 重复 | `calendar-service.ts` |
| **提醒中心** | 今日/本周/本月/即将到来分类 | `calendar-service.ts` |
| **数据看板** | 成员统计、关系分布、记忆统计、完整度评分 | `statistics-service.ts` |
| **成果物** | 三代谱/记忆册/故事册/年鉴预览生成 | `output-service.ts` |
| **权限** | owner/admin/memory_admin/member/viewer 五级角色、RLS | `permission-service.ts` |
| **UI** | wujia 设计系统、20 页全站美化、7 个可复用组件 | Tailwind CSS |

## 2. 可借鉴开源项目清单

| # | 项目 | Stars | License | 技术栈 | 适合度 |
| --- | --- | --- | --- | --- | --- |
| 1 | **Kindred** (pmilano1) | ~200+ | — | Next.js + D3 + PostgreSQL + GraphQL | ⭐⭐⭐⭐⭐ |
| 2 | **Genea.app** | 245 | MIT | 浏览器端 + Graphviz WASM + GEDCOM | ⭐⭐⭐⭐ |
| 3 | **qiaoshouqing/familytree** | 524 | — | Next.js + TypeScript + JSON | ⭐⭐⭐⭐ |
| 4 | **Homechart** | 142 | — | Go + Docker + 家庭日历/提醒 | ⭐⭐⭐⭐ |
| 5 | **Gramps Web** | 1,174 | AGPL-3.0 | Python + Lit + SQLite/PostgreSQL | ⭐⭐⭐ |
| 6 | **webtrees** | 676 | GPL-3.0 | PHP + MySQL + GEDCOM | ⭐⭐ |

## 3. 每个开源项目可借鉴点

### 3.1 Kindred — 最高借鉴价值

| 可借鉴 | 详情 | 对应页面 |
| --- | --- | --- |
| Dashboard 主页设计 | 统计卡片 + 最近活动 + 研究建议 + 快捷操作 | `/family` |
| D3 双向树 | 任一节点展开祖先+后代，minimap、pedigree collapse | `/family/tree` |
| 时间线视图 | Gantt 图风格，按十年分组、寿命条 | 新页面 `/family/timeline` |
| 世界地图可视化 | 气泡聚合、迁徙线、热力图、时间动画 | 新页面 `/family/map` |
| 重复检测 | 模糊姓名匹配 + 日期比较 | 后台逻辑 |
| 循环关系检测 | 防止不合法家族关系 | 后台逻辑 |
| 树节点照片缩略图 | 在家族树节点上显示头像缩略图 | `/family/tree/graph` |
| 研究备注 | 每个成员可添加 Markdown 研究笔记 | `/family/members/[id]` |

### 3.2 Genea.app — 交互设计借鉴

| 可借鉴 | 详情 |
| --- | --- |
| 浏览器端全离线 | 无服务器依赖，纯客户端运行 |
| 拖拽式关系编辑 | Graphviz 自动布局，拖拽连接节点 |
| GEDCOM 导入/导出 | 标准化家谱数据交换 |
| 最小化 UI | 极简界面，聚焦树编辑 |

### 3.3 qiaoshouqing/familytree — 实现参考

| 可借鉴 | 详情 |
| --- | --- |
| 按世代组织数据 | `generations[]` 结构清晰 |
| JSON 数据格式 | 简化数据录入和维护 |
| AI 辅助数据生成 | 用 LLM 生成家族数据 JSON |
| 父子 ID 关联 | 简单的 `fatherId` 链接模式 |

### 3.4 Homechart — 日历/提醒借鉴

| 可借鉴 | 详情 |
| --- | --- |
| 统一日历视图 | 聚合任务、餐食、事件到一个日历 |
| 重复任务管理 | 灵活的重复规则配置 |
| 家庭成员权限 | 按角色控制可见和编辑范围 |
| 事件参与者 | 多成员参与同一事件 |
| 奖励/打卡系统 | stamp cards 正向激励 |

### 3.5 Gramps Web — 高阶参考

| 可借鉴 | 详情 |
| --- | --- |
| 多种图表类型 | 扇形图、沙漏图、祖先/后代图、关系图 |
| AI 聊天助手 | 自然语言查询家族树 |
| 外部搜索集成 | 对接 FamilySearch、Ancestry 等 |
| 协作编辑 | WebSocket 实时多用户同步 |
| DNA 工具 | 染色体图谱、三角分析 |
| 隐私控制 | 五级粒度：站点→树→用户→记录→事实 |

### 3.6 webtrees — 隐私/标准借鉴

| 可借鉴 | 详情 |
| --- | --- |
| 五级隐私控制 | 站点/树/用户/记录/事实 层层设置 |
| GEDCOM 标准 | 完整导入/导出/验证流程 |
| 多媒体管理 | 照片/文档/证书/视频/音频 |
| 变更日志 | 记录用户操作审计 |

## 4. 不适合借鉴的功能及原因

| 功能 | 来源 | 不适合原因 |
| --- | --- | --- |
| GEDCOM 导入/导出 | 多个项目 | 涉及数据库 schema 大改 + 新增 migration |
| AI 聊天助手 | Gramps Web | 需接入 LLM API，超出当前产品边界 |
| 外部搜索（FamilySearch 等） | Gramps Web | 涉及第三方 API 集成 |
| DNA 染色体工具 | Gramps Web | 完全不同的产品方向 |
| WebSocket 实时协作 | Gramps Web | 需改 Supabase realtime 架构 |
| 世界地图（迁徙线/热力图） | Kindred | 需新增地图库依赖 + 地理数据 |
| 预算/购物/食谱 | Homechart | 超出家族关系操作系统定位 |
| 多语言 60+ | webtrees | 当前只需中文 |
| 论坛/Blog/RSS | Gramps Web | 属开放社区，产品边界禁止 |
| 邮件邀请系统 | Kindred | 涉及邮件服务配置 |

## 5. P0/P1/P2 功能升级建议

### P0（核心体验，必须做）

| # | 建议 | 借鉴来源 | 描述 |
| --- | --- | --- | --- |
| — | 无 | — | 当前核心功能已完整，无阻断性问题 |

### P1（显著提升体验，建议近期做）

| # | 建议 | 借鉴来源 | 描述 |
| --- | --- | --- | --- |
| P1-1 | 家堂首页 Dashboard 重构 | Kindred | 统计卡片 + 最近活动时间线 + 快捷操作 + 完善建议 |
| P1-2 | 家人档案页增加"研究备注" | Kindred | Markdown 文本区，成员级自由备注 |
| P1-3 | 2D 图谱节点显示头像缩略图 | Kindred | `portrait_url` 非空时替换首字符 |
| P1-4 | 关系图增加 minimap 导航 | Kindred | 大图谱时的小地图快速定位 |

### P2（锦上添花，可排期）

| # | 建议 | 借鉴来源 | 描述 |
| --- | --- | --- | --- |
| P2-1 | 时间线视图 | Kindred | 按年份/十年展示所有成员寿命条 |
| P2-2 | 统一日历聚合视图 | Homechart | 故事/照片/议事/节点聚合到一个日历 |
| P2-3 | 拖拽式添加亲属 | Genea.app | 从本人节点拖出连线创建关系 |
| P2-4 | 重复成员检测 | Kindred | 模糊匹配提示可能的重复档案 |
| P2-5 | 循环关系检测 | Kindred | 保存前验证关系合法性 |
| P2-6 | 变更日志 | webtrees | 记录关键操作审计（已有 action_logs 表） |
| P2-7 | 邀请 bulk 操作 | — | 一键为所有待认领成员生成邀请 |

## 6. 每个建议对应的页面/文件

| 建议 | 页面/路由 | 涉及文件 |
| --- | --- | --- |
| P1-1 Dashboard | `/family` | `src/app/family/page.tsx` |
| P1-2 研究备注 | `/family/members/[id]` | `src/app/family/members/[id]/page.tsx` |
| P1-3 头像缩略图 | `/family/tree/graph` | GenealogyNodeCard |
| P1-4 Minimap | `/family/tree/graph` | GenealogyGraph |
| P2-1 时间线 | `/family/timeline` (新) | 新页面 + genealogy adapter |
| P2-2 日历聚合 | `/family/calendar` | `src/app/family/calendar/page.tsx` |
| P2-3 拖拽关系 | `/family/tree` + `/family/relatives/new` | 新交互组件 |
| P2-4 重复检测 | 后台 | `person-service.ts` |
| P2-5 循环检测 | 后台 | `person-service.ts` |
| P2-6 变更日志 | 后台 | `action_logs` 表 + UI 展示 |
| P2-7 批量邀请 | `/family/invite` | `src/app/family/invite/page.tsx` |

## 7. 是否需要改数据库

| 建议 | 需要改 DB？ | 说明 |
| --- | --- | --- |
| P1-1 Dashboard | 否 | 仅前端聚合现有数据 |
| P1-2 研究备注 | 否 | `person_profiles.bio` 字段即可 |
| P1-3 头像缩略图 | 否 | `portrait_url` 已有 |
| P1-4 Minimap | 否 | 纯前端 |
| P2-1 时间线 | 否 | 使用现有 `person_profiles.birth_year/death_year` |
| P2-2 日历聚合 | 否 | 聚合现有 calendar/story/photo/meeting 数据 |
| P2-3 拖拽关系 | 否 | 调用现有 `createPersonRelation` |
| P2-4 重复检测 | 否 | 纯逻辑 |
| P2-5 循环检测 | 否 | 纯逻辑 |
| P2-6 变更日志 | 否 | `action_logs` 表已存在 |
| P2-7 批量邀请 | 否 | 使用现有 `createInviteToken` |

**结论：所有 P1/P2 建议均不需要修改数据库。**

## 8. 是否需要新增依赖

| 建议 | 需要新依赖？ | 说明 |
| --- | --- | --- |
| P1-1 ~ P1-4 | 否 | 纯前端 Tailwind + React |
| P2-1 时间线 | 否 | 可用 CSS Flexbox/Grid 实现 Gantt 风格 |
| P2-2 日历聚合 | 否 | 纯前端组件 |
| P2-3 拖拽关系 | 否 | 可用原生 Drag & Drop API |
| P2-4 ~ P2-7 | 否 | 纯逻辑或使用现有 API |

**结论：所有建议均不需要新增 npm 依赖。**

## 9. 是否适合当前 UI 美化阶段

| 建议 | 适合？ | 原因 |
| --- | --- | --- |
| P1-1 Dashboard | ✅ 非常适合 | 纯 UI 改动，数据已就绪 |
| P1-2 研究备注 | ✅ 适合 | 在现有编辑表单加一个 textarea |
| P1-3 头像缩略图 | ✅ 适合 | 图谱组件已有节点渲染，加 `<img>` 即可 |
| P1-4 Minimap | ⚠️ 中等 | 需要修改图谱组件逻辑 |
| P2-1 时间线 | ⚠️ 中等 | 需要新页面 |
| P2-2 日历聚合 | ✅ 适合 | 纯前端视图聚合 |
| P2-3 拖拽关系 | ❌ 不适合 | 需要新的交互模式设计 |
| P2-4 重复检测 | ❌ 不适合 | 后台逻辑，非 UI |
| P2-5 循环检测 | ❌ 不适合 | 后台逻辑，非 UI |
| P2-6 变更日志 | ⚠️ 中等 | 需要新 UI 页面读 action_logs |
| P2-7 批量邀请 | ✅ 适合 | 邀请页加一个按钮 |

## 10. 下一步最小可执行任务

### 推荐立即执行（UI 美化阶段内）

**任务 A：家堂首页 Dashboard 重构（P1-1）**

借鉴 Kindred 的 Dashboard 设计，重构 `/family` 页面：

1. 顶部：欢迎区（家堂名 + 今日日期 + 快捷设置）
2. 统计行：4 张卡片（成员/认领率/故事/提醒）
3. 快捷入口：2×4 图标网格（已有，保留）
4. 动态区：双栏布局
   - 左：最近议事（最多 3 条）
   - 右：最近提醒（最多 3 条）
5. 底部：完善建议卡片（基于 completion score）

不改数据库、不改 services、不改 types、不改 package.json。

完成后运行 `npx tsc --noEmit && npm run lint && npm run build`。

---

**任务 B：家人档案增加研究备注（P1-2）**

在 `/family/members/[id]` 编辑表单中增加一个 Markdown 风格备注区，使用 `person_profiles.bio` 字段（已存在）。

---

**任务 C：2D 图谱节点显示头像（P1-3）**

修改 `GenealogyNodeCard` 组件，当 `portrait_url` 不为空时显示 `<img>` 替代首字符。

---

这三个任务可在当前 UI 美化阶段内完成，不需要突破任何严格限制。

### 后续排期（UI 美化阶段结束后）

- **P2-1 时间线视图**：需要新页面设计
- **P2-2 日历聚合**：前端视图聚合
- **P2-6 变更日志**：读取 action_logs 展示
- **P2-4/P2-5**：后台校验逻辑（需 service 层改动）

---

## 附录：参考项目链接

- Kindred: https://github.com/pmilano1/kindred
- Genea.app: https://github.com/genea-app/genea-app
- familytree: https://github.com/qiaoshouqing/familytree
- Homechart: https://github.com/candiddev/homechart
- Gramps Web: https://github.com/gramps-project/gramps-web
- webtrees: https://webtrees.net
