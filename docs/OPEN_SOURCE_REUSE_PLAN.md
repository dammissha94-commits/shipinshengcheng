# 吾家祠堂开源项目吸收策略

吾家祠堂 = 家族关系操作系统 + 数字家堂 + 家族记忆资产库。

吾家祠堂不是祭祀 App，不是宗教平台，不是纪念馆，不做支付，不做 IM，不做开放社区。

## 1. 总体原则

1. 不整仓引入任何项目。
2. MIT / Apache / BSD 项目可按模块吸收思路，必要时小段重写。
3. GPL / AGPL 项目禁止复制代码，只能参考设计、数据模型、交互逻辑。
4. 无明确 License 或 All rights reserved 项目禁止复制代码，只能参考产品流程。
5. 所有第三方依赖必须登记到 LICENSES/ 或文档中。
6. 所有引入方向必须经过产品边界检查。

## 2. 禁止引入方向

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
- 陌生人社交

## 3. 允许吸收方向

- 家族关系
- 私密相册
- 记忆资料
- 家庭日历
- 议事投票
- 权限隔离
- 中文亲属称谓
- 家谱数据兼容
- 家族关系图谱

## 4. 项目分级

### 4.1 P0/P1 可优先研究

#### 1. ExploringTheCodeWorld/relationship-ts

- License: MIT
- 用途：中文亲属称谓、关系链、反向称谓
- 处理方式：可考虑 npm 接入，也可重写适配层
- 对应模块：家人档案、关系高亮、搜索理解、称谓显示

#### 2. banadawit/Family-Memories-Hub

- License: MIT
- 用途：私密家庭相册、Supabase Storage、RLS、邀请制
- 处理方式：只参考 schema、RLS、Storage 流程，不搬 UI
- 对应模块：家族相册、家族故事、权限隔离

#### 3. ulsklyc/oikos

- License: MIT
- 用途：家庭日历、提醒、家庭资料、隐私、备份理念
- 处理方式：只参考产品设计和数据模型，不引代码
- 对应模块：家庭节点提醒、家族日历、成员资料

#### 4. donatso/family-chart

- License: 需锁定版本核验，存在 MIT/ISC 不一致风险
- 用途：家族树布局、缩放、卡片、节点交互
- 处理方式：暂不直接接入，先做 license 版本核验和数据适配评估
- 对应模块：2D 家族关系图、三代谱

### 4.2 只参考，不引代码

#### 1. gramps-project/gramps-web

- License: AGPL-3.0
- 处理方式：只参考高级谱系模型、隐私规则、搜索、导出

#### 2. fisharebest/webtrees

- License: GPL-3.0+
- 处理方式：只参考 GEDCOM、隐私规则、媒体资料管理

#### 3. emilioschepis/rtpoll

- License: GPL-3.0
- 处理方式：只参考投票 RLS、唯一投票约束、统计逻辑

#### 4. amitesh-maurya/poll-application

- License: 许可不清晰/限制商业使用
- 处理方式：只参考投票产品流程，不引代码

#### 5. leerob/image-gallery-supabase-tailwind-nextjs

- License: License 不明确且 archived
- 处理方式：只参考 Supabase 图片 gallery 教程思路

## 5. 当前阶段执行原则

当前仍处于第三阶段第二步：真实测试 P0/P1 阻断修复。

在以下问题修完前，不开始接入任何新开源依赖：

1. /family/statistics 家堂数据看板启动失败
2. /family/calendar 新增家庭节点保存失败
3. /family/meetings/[id] 议事详情打开失败
4. 议事投票功能缺失或不可用

## 6. 后续接入顺序建议

1. 先修复 P0/P1 阻断。
2. 参考 rtpoll / poll-application 的思路修复投票，但不引代码。
3. 单独评估 relationship-ts，形成 src/lib/kinship/ 适配层。
4. 再评估 Family-Memories-Hub 的 Storage/RLS 流程。
5. 再评估 oikos 的日历提醒设计。
6. 最后评估 family-chart 是否替代或增强当前 2D 图谱。
