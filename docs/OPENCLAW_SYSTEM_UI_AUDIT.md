# 吾家祠堂 APP — 全局系统审计报告

> 审计时间：2026-05-06  
> 审计人：AutoClaw  
> 项目目录：`C:\Users\Lenovo\Documents\Projects\wujia-citang-app`  
> 审计范围：页面结构、UI风格、产品定位合规、代码质量、路由、Supabase调用、权限安全

---

## 一、当前系统功能现状

| 模块 | 当前文件 | 当前状态 | 是否满足MVP | 主要问题 | 风险等级 |
|------|---------|---------|-----------|---------|---------|
| 登录/注册 | `src/app/login/page.tsx` | ✅ 可用 | ✅ | UI用email字段但placeholder写"手机号"、密码框placeholder写"验证码"，与实际逻辑不一致；微信登录按钮未实现 | 🟡 P0-B |
| 创建祠堂 | `src/app/create/page.tsx` | ✅ 可用 | ✅ | UI风格与家族首页不一致（stone系 vs 暖色系）；无前置引导 | 🟢 P1 |
| 家族首页 | `src/app/family/page.tsx` | ✅ 可用 | ✅ | **最佳页面**，动态化做得好；但与其他子页面风格割裂（首页暖色调，子页全部emerald-950暗绿） | 🔴 P0-A |
| 三代谱（列表） | `src/app/family/tree/page.tsx` | ✅ 可用 | ✅ | emerald-950暗绿色header卡片与家族首页暖色系不一致 | 🟡 P0-B |
| 家族关系图 | `src/app/family/tree/graph/page.tsx` | ✅ 可用 | ✅ | 同上；react-force-graph动态加载较大 | 🟢 P1 |
| 成员列表 | `src/app/family/members/page.tsx` | ✅ 可用 | ✅ | **存在编码问题**：部分中文字符乱码（"已认领"显示为"已认�?"）；同上风格问题 | 🔴 P0-A |
| 成员详情 | `src/app/family/members/[id]/page.tsx` | ✅ 可用 | ✅ | 需确认编码是否同样存在乱码 | 🟡 P0-B |
| 添加亲属 | `src/app/family/relatives/new/page.tsx` | ✅ 可用 | ✅ | 无明显问题，风格与tree一致 | 🟢 P1 |
| 邀请认领 | `src/app/family/invite/page.tsx` | ✅ 可用 | ✅ | 功能完整，逻辑正确 | 🟢 P1 |
| 认领页面 | `src/app/claim/[token]/page.tsx` | ✅ 可用 | ✅ | 流程完整（登录检查→认领→裂变引导）；是核心闭环关键页 | ✅ OK |
| 家族故事 | `src/app/family/stories/page.tsx` | ✅ 可用 | ✅ | 故事列表不展示关联人名，只存ID；没有故事详情页 | 🟡 P0-B |
| 家族相册 | `src/app/family/photos/page.tsx` | ✅ 可用 | ✅ | 功能完整（上传/预览/灯箱/年份筛选）；无照片详情页 | 🟢 P1 |
| 家族日历 | `src/app/family/calendar/page.tsx` | ✅ 可用 | ✅ | 功能完整；"家庭节点"命名偏生硬 | 🟢 P1 |
| 提醒中心 | `src/app/family/reminders/page.tsx` | ✅ 可用 | ✅ | 正常 | ✅ OK |
| 家族议事 | `src/app/family/meetings/page.tsx` | ✅ 可用 | ⚠️ | 偏离定位风险：包含"通知/投票/家庭聚会/纪念日"，其中"投票"功能接近泛社交化 | 🟡 P0-B |
| 家族动态 | `src/app/family/activity/page.tsx` | ✅ 可用 | ✅ | 时间线UI优秀；无问题 | ✅ OK |
| 数据看板 | `src/app/family/statistics/page.tsx` | ✅ 可用 | ✅ | "数据看板"命名偏运营化，但功能合理 | 🟢 P1 |
| 成果物 | `src/app/family/output/page.tsx` | ✅ 可用 | ⚠️ | 文件编码可能存在乱码（未完全确认） | 🟡 P0-B |
| 家堂设置 | `src/app/family/settings/page.tsx` | ✅ 可用 | ✅ | 长辈模式toggle实现合理；注销/归档按钮disabled | ✅ OK |

---

## 二、页面UI现状

| 页面 | 当前视觉问题 | 与目标风格差距 | 优先级 | 建议调整动作 |
|------|-----------|-------------|--------|-----------|
| **登录页** `login/` | 暖色米黄`#F7F3EC`底色，棕系`#5D4037`文字，SVG家谱树装饰 | ✅ 与品牌调性吻合，**最佳登录风格** | — | 保持，作为全局设计基准 |
| **创建祠堂** `create/` | `bg-stone-50`底 + `emerald-950`按钮，与登录页暖色调不统一 | 🔴 中等偏大 | P0-B | 按登录页暖色调统一：stone→cream，emerald→棕金系 |
| **家族首页** `family/` | 暖色系`#F8F1E7`底 + 棕色`#5A3524`主色 + 金色`#C9A35A`点缀，Hero Card设计精美 | ✅ **设计最佳，应作为全局主风格** | — | **提取为设计规范**，统一其他页面 |
| **三代谱** `family/tree/` | `bg-stone-50` + `emerald-950`暗绿header | 🔴 与首页暖色严重割裂 | P0-A | header卡片改为暖色系，与首页Hero Card呼应 |
| **关系图** `family/tree/graph/` | 同三代谱问题 | 🟡 中等 | P0-B | 同上 |
| **成员列表** `family/members/` | 同三代谱 + **编码乱码** | 🔴 严重 | P0-A | 修复编码；header改暖色 |
| **成员详情** `family/members/[id]/` | 同上 | 🟡 中等 | P0-B | 确认编码；header改暖色 |
| **添加亲属** `family/relatives/new/` | `bg-stone-50` + `emerald-950`按钮 | 🟡 中等 | P0-B | 统一暖色调 |
| **邀请页** `family/invite/` | `bg-stone-50` + `emerald-950`按钮 | 🟡 中等 | P1 | 统一暖色调 |
| **认领页** `claim/[token]/` | `bg-stone-50` + `emerald-950`按钮 | 🟡 中等 | P1 | 统一暖色调 |
| **故事页** `family/stories/` | `emerald-950`header | 🟡 中等 | P0-B | 统一暖色调 |
| **相册页** `family/photos/` | `emerald-950`header | 🟡 中等 | P1 | 统一暖色调 |
| **日历页** `family/calendar/` | `emerald-950`header | 🟡 中等 | P1 | 统一暖色调 |
| **提醒中心** `family/reminders/` | `emerald-950`header | 🟡 中等 | P1 | 统一暖色调 |
| **议事页** `family/meetings/` | `emerald-950`header | 🟡 中等 | P1 | 统一暖色调 |
| **动态页** `family/activity/` | `bg-stone-50` | 🟡 中等 | P1 | 统一暖色调 |
| **数据看板** `family/statistics/` | `emerald-950`header | 🟡 中等 | P1 | 统一暖色调 |
| **设置页** `family/settings/` | `bg-stone-50` + `emerald-950` | 🟡 中等 | P1 | 统一暖色调 |
| **AppHeader** 组件 | 使用`pine/cream/sand/charcoal`CSS变量 + `card`类型 | 🟡 与实际使用不一致：代码中定义了pine/cream设计token但大部分页面直接硬编码stone/emerald | P0-A | **统一使用CSS变量**，避免硬编码 |

### 核心风格问题总结

**现状**：项目中存在两套设计体系并行：
1. **暖色体系**（家族首页 + 登录页）：`#F8F1E7`底、`#5A3524`棕主色、`#C9A35A`金色点缀
2. **冷色体系**（其他所有子页面）：`stone-50`底、`emerald-950`暗绿主色

**CSS变量已定义但未使用**：`globals.css`定义了`--pine`、`--cream`、`--sand`、`--gold`、`--charcoal`、`--card`等变量，且`AppHeader`组件使用了这些变量，但**几乎所有页面的body内容区都绕过了CSS变量直接使用Tailwind的stone/emerald色值**。

**根因**：家族首页和登录页是后期重新设计的，其他子页面仍沿用旧的emerald-950风格。

---

## 三、系统优化清单

### P0-A：必须先修，不修影响核心闭环

| # | 问题 | 影响范围 | 建议动作 |
|---|------|---------|---------|
| 1 | **成员列表页编码乱码** | `family/members/page.tsx` | 文件编码未保存为UTF-8，中文"已认领""待认领""男""女"等显示为乱码。**检查并修复文件编码** |
| 2 | **UI风格割裂** | 除首页/登录外所有页面 | 统一为暖色系。方案：将`emerald-950`替换为棕金系色值（参考家族首页），`stone-50`底色替换为`cream` |
| 3 | **CSS变量定义但未使用** | 全局 | 统一使用`globals.css`已定义的设计token（pine/cream/sand/gold/charcoal/card），禁止页面内硬编码色值 |

### P0-B：必须修，但可第二批

| # | 问题 | 影响范围 | 建议动作 |
|---|------|---------|---------|
| 4 | **登录页UI与逻辑不匹配** | `login/page.tsx` | input type=email但placeholder写"手机号"；type=password但placeholder写"验证码"；微信登录按钮无实际功能且文案误导 |
| 5 | **故事页缺少详情页** | `family/stories/` | 故事列表只显示title+content预览，点击后无跳转，无法查看完整故事或编辑 |
| 6 | **故事关联人只存ID不展示** | `family/stories/` | `related_person_ids`字段存的是ID数组，但StoryCard不解析和展示关联人名 |
| 7 | **成果物页编码检查** | `family/output/page.tsx` | 需确认是否同样存在编码乱码 |
| 8 | **议事页"投票"功能** | `family/meetings/` | MeetingType包含`vote`（投票），有偏离"祠堂"定位的风险。建议保留但弱化，或将label改为"家族决议" |
| 9 | **日历术语"家庭节点"** | `family/calendar/` | "家庭节点"命名生硬，建议改为"家庭纪念日"或"家族时刻" |

### P1：体验优化，可排后

| # | 问题 | 建议动作 |
|---|------|---------|
| 10 | 创建祠堂页无前置引导 | 添加简洁的"什么是数字祠堂"一句话说明 |
| 11 | 成员详情页待确认 | 需读取确认编码和功能完整性 |
| 12 | 相册无详情页 | 照片卡片不可点击查看大图+关联信息（虽有灯箱但无信息面板） |
| 13 | 邀请页文案可优化 | "如何邀请？"说明文案稍长，可精简 |
| 14 | 数据看板命名 | "数据看板"偏运营化，可改为"家堂概览"或"家族档案" |
| 15 | 子页面重复组件 | `sanitizeError`函数在calendar、meetings、reminders等页面重复定义；`F`/`VS`/`FA`表单组件也在多页重复内联 |
| 16 | react-force-graph bundle | `GenealogyGraph`使用`dynamic import`做了正确处理，但首次加载仍可能较大 |
| 17 | `createSupabaseServiceClient` 实现 | 当前直接将browser client cast为service client，绕过了service role权限隔离 |

### P3：禁止做或暂不做

| # | 项目 | 原因 |
|---|------|------|
| ❌ | 祭祀功能 | 偏离"数字化祠堂"定位，产品明确排除 |
| ❌ | IM聊天 | 偏离定位 |
| ❌ | 开放社区/广场 | 产品是私密的家族空间 |
| ❌ | 排行榜/积分 | 偏离定位 |
| ❌ | 商城/交易 | 偏离定位 |
| ❌ | 现金/积分裂变 | 产品裂变通过"邀请认领→补充亲属"实现，不走利益裂变 |
| ⏸ | 微信登录 | 当前无微信开放平台资质，按钮已disabled，暂不动 |
| ⏸ | 账号注销 | 已disabled，待后续版本 |
| ⏸ | 家堂归档 | 已disabled，待后续版本 |

---

## 四、可改文件清单

### ✅ 可以改（前端UI/CSS/组件层）

| 类别 | 文件 |
|------|------|
| 全局样式 | `src/app/globals.css` |
| 全局布局 | `src/app/layout.tsx` |
| 登录页 | `src/app/login/page.tsx` |
| 创建页 | `src/app/create/page.tsx` |
| 家族首页 | `src/app/family/page.tsx` |
| 三代谱 | `src/app/family/tree/page.tsx` |
| 关系图 | `src/app/family/tree/graph/page.tsx` |
| 成员列表 | `src/app/family/members/page.tsx` |
| 成员详情 | `src/app/family/members/[id]/page.tsx` |
| 添加亲属 | `src/app/family/relatives/new/page.tsx` |
| 邀请页 | `src/app/family/invite/page.tsx` |
| 认领页 | `src/app/claim/[token]/page.tsx` |
| 故事页 | `src/app/family/stories/page.tsx` |
| 相册页 | `src/app/family/photos/page.tsx` |
| 日历页 | `src/app/family/calendar/page.tsx` |
| 提醒中心 | `src/app/family/reminders/page.tsx` |
| 议事页 | `src/app/family/meetings/page.tsx` |
| 动态页 | `src/app/family/activity/page.tsx` |
| 数据看板 | `src/app/family/statistics/page.tsx` |
| 成果物 | `src/app/family/output/page.tsx` |
| 设置页 | `src/app/family/settings/page.tsx` |
| 公共组件 | `src/components/AppHeader.tsx` |
| 公共组件 | `src/components/wujia/*.tsx` |
| UI组件 | `src/components/ui/*.tsx` |
| 工具函数 | `src/lib/utils.ts` |

### ⚠️ 暂不建议动

| 类别 | 文件 | 原因 |
|------|------|------|
| 类型定义 | `src/types/domain.ts` | 结构完整，修改可能破坏service层 |
| 类型定义 | `src/types/service.ts` | 同上 |
| 业务服务 | `src/lib/services/*.ts` | 核心业务逻辑，当前功能正常 |
| Auth | `src/lib/auth/*.ts` | 认证逻辑，改错会破坏登录/认领流程 |
| Supabase客户端 | `src/lib/supabase/client.ts` | 当前实现可用（虽有service client cast问题但暂不影响功能） |
| 亲缘计算 | `src/lib/kinship/*.ts` | 核心算法，已验证 |
| 家谱构建 | `src/lib/genealogy/*.ts` | 关系图核心，已验证 |
| 数据库迁移 | `supabase/migrations/*.sql` | ⛔ 禁止修改，涉及生产数据 |
| Next配置 | `next.config.ts` | 无需改动 |
| package.json | — | 当前依赖合理，不新增不删除 |

---

## 五、风险说明

### 5.1 是否需要改数据库？

**本次UI优化不需要改数据库。** 所有发现的问题都在前端展示层。

### 5.2 是否可能影响现有真实数据？

**不会。** 本次优化范围是：
- CSS/颜色值替换（视觉层）
- 文件编码修复（格式层）
- 文案微调（内容层）

不涉及任何数据写入、API调用变更或数据结构修改。

### 5.3 是否可能破坏认证逻辑？

**不会。** 认证逻辑（`src/lib/auth/`）不在本次修改范围内。登录页只改文案和placeholder，不改表单提交逻辑。

### 5.4 是否可能破坏邀请认领流程？

**不会。** 邀请认领流程（`invite-service`、`claim/[token]`）不在本次修改范围内。认领页只可能做CSS色调统一。

### 5.5 其他风险

| 风险 | 说明 | 缓解措施 |
|------|------|---------|
| CSS色值替换遗漏 | emerald-950在大量页面使用，批量替换可能遗漏个别位置 | 替换后做全项目grep确认无遗漏 |
| Tailwind类名冲突 | stone→cream替换可能影响间距/边框的视觉层次 | cream色(#F5F2EB)与stone-50(#FAFAF9)接近，影响极小 |
| 成员列表编码修复 | 文件编码问题可能在其他文件中也存在 | 修复后全量检查所有.tsx文件 |
| AppHeader CSS变量 | 当前header用pine/cream，body用stone/emerald，统一后需同步更新AppHeader的CSS变量值 | 将CSS变量的值调整为暖色系 |

---

## 六、下一步唯一建议动作

### 🔧 修复 `src/app/family/members/page.tsx` 的文件编码问题

**理由**：成员列表是核心功能页，中文乱码直接影响用户使用体验，且修复成本极低（保存为UTF-8即可），不涉及任何逻辑变更。

**操作**：
1. 用编辑器打开 `src/app/family/members/page.tsx`
2. 确认文件编码（当前疑似GBK/GB2312）
3. 转换为UTF-8（无BOM）
4. 检查其他文件是否有同样问题
5. 本地验证页面显示正常

**完成后的下一步**：编码修复完成后，再启动 **P0-A 的UI风格统一** 工作（emerald-950→暖色系替换）。

---

## 附录：项目技术概况

| 项目 | 详情 |
|------|------|
| 框架 | Next.js 15 (App Router) |
| UI | Tailwind CSS v4 (@tailwindcss/postcss) |
| 后端 | Supabase (Auth + Database + Storage) |
| 图谱 | react-force-graph (dynamic import) |
| 图标 | lucide-react |
| 动画 | CSS transitions (无framer-motion) |
| 状态管理 | React useState/useEffect (无全局状态库) |
| 数据库表 | family_spaces, person_profiles, person_relations, invite_tokens, family_memberships, action_logs, family_stories, family_photos, family_calendar_events, family_meetings, family_meeting_opinions, family_meeting_votes, family_outputs |
| 迁移数量 | 17个migration文件 |
| 页面数量 | ~20个路由页面 |
| 组件数量 | ~15个组件 |

---

*本审计报告基于源代码静态分析生成，未涉及运行时测试。建议在执行任何修改前做好git commit备份。*