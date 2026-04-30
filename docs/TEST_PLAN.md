# 吾家祠堂真实家庭测试计划

## 一、测试目标

验证以下完整闭环：

1. 注册 / 登录
2. 创建数字家堂
3. 添加本人、父母、配偶、子女
4. 生成三代谱
5. 邀请亲属认领
6. 被邀请人认领
7. 家人档案编辑
8. 生日同步到家族日历
9. 家庭节点提醒中心展示
10. 家族故事创建
11. 家族相册创建
12. 家族议事创建
13. 投票参与
14. 成果物预览
15. 权限限制

## 二、测试账号

建议准备：

- 账号 A：家堂创建者 owner
- 账号 B：被邀请亲属 member
- 账号 C：普通成员 member
- 账号 D：非成员，用于验证无权限访问

## 三、核心测试路径

### 路径 1：注册与创建家堂

操作步骤：

1. 使用账号 A 注册或登录。
2. 从首页输入姓氏，进入创建页面。
3. 填写本人姓名、性别等基础信息。
4. 创建数字家堂。

预期结果：

- 创建成功后进入 `/family`。
- 自动创建 `profiles`、`family_spaces`、`family_memberships`、本人 `person_profiles`。
- 当前用户为 owner。

失败表现：

- 登录失败。
- 创建后无法进入 `/family`。
- 页面出现英文原始错误。

关联表：

- `profiles`
- `family_spaces`
- `family_memberships`
- `person_profiles`
- `action_logs`

### 路径 2：添加亲属

操作步骤：

1. 账号 A 进入 `/family/tree`。
2. 点击添加父母、配偶、子女。
3. 填写关系、姓名、性别、出生年份。
4. 保存后返回三代谱。

预期结果：

- 三代谱对应层级出现新成员。
- 成员列表可看到新增档案。
- 不要求手机号、身份证、住址。

失败表现：

- 保存后页面无变化。
- 普通 member 可添加他人亲属。
- 出现未入库字段。

关联表：

- `person_profiles`
- `person_relations`
- `action_logs`

### 路径 3：邀请认领

操作步骤：

1. 账号 A 进入 `/family/invite`。
2. 为未认领成员生成邀请链接。
3. 复制链接，用账号 B 打开。
4. 账号 B 登录后确认认领。

预期结果：

- 账号 B 成为该 family 的 member。
- 被认领的 `person_profiles.bound_user_id` 更新为账号 B。
- `claim_status` 更新为 `claimed`。
- 邀请 token 状态更新为 `claimed`。

失败表现：

- 过期或已认领 token 仍可重复认领。
- 账号 B 认领到错误 family。
- 非登录用户可直接完成认领。

关联表：

- `invite_tokens`
- `person_profiles`
- `family_memberships`
- `action_logs`

### 路径 4：生日提醒

操作步骤：

1. 账号 B 进入自己的家人档案页。
2. 填写出生年份、月份、日期。
3. 保存生日信息。
4. 打开 `/family/calendar` 和 `/family/reminders`。

预期结果：

- 生日提醒同步到家族日历。
- 来源显示为自动生日提醒。
- 提醒中心展示今日、本周、本月或即将到来的家庭节点。

失败表现：

- 只填年份却生成日历提醒。
- 清空月份或日期后提醒仍保持 active。
- 普通 member 可编辑他人生日。

关联表：

- `person_profiles`
- `family_calendar_events`
- `action_logs`

### 路径 5：家族故事 / 相册

操作步骤：

1. 家庭成员进入 `/family/stories` 创建故事。
2. 家庭成员进入 `/family/photos` 创建相册记录。
3. 分别设置可见范围。
4. 用不同账号查看列表。

预期结果：

- family 可见内容对家庭成员可见。
- private 内容仅创建者和有权限管理员可见。
- 非成员不可读取。

失败表现：

- 非成员看到 family 数据。
- private 内容被普通成员看到。
- 内容创建后不显示。

关联表：

- `family_stories`
- `family_photos`
- `action_logs`

### 路径 6：家族议事 / 投票

操作步骤：

1. 有权限账号进入 `/family/meetings` 创建议事。
2. 创建投票类议事并设置选项。
3. 账号 B 或 C 进入详情页参与投票。
4. 查看投票结果。

预期结果：

- 议事详情可打开。
- 每个成员按规则参与投票。
- 投票记录可统计。

失败表现：

- 普通 member 可管理全部议事。
- 重复投票未按规则处理。
- 关闭或归档议事仍可异常修改。

关联表：

- `family_meetings`
- `family_meeting_votes`
- `action_logs`

### 路径 7：成果物预览

操作步骤：

1. owner 或有权限管理员进入 `/family/output`。
2. 生成三代谱、家族记忆册、家族故事册或家族年鉴预览。
3. 查看成果物记录列表。

预期结果：

- 只生成结构化预览数据。
- 不生成真实文件。
- 不出现下载、支付等流程。

失败表现：

- 普通 member 可创建成果物。
- 生成真实文件或出现外部交易入口。
- 预览摘要为空且无说明。

关联表：

- `family_outputs`
- `person_profiles`
- `person_relations`
- `family_stories`
- `family_photos`
- `action_logs`

### 路径 8：权限验证

操作步骤：

1. 分别使用 owner、member、非成员访问核心页面。
2. 尝试添加亲属、生成邀请、编辑他人档案、创建成果物、管理议事。
3. 记录每种角色的结果。

预期结果：

- owner 可管理核心家庭数据。
- member 可查看家庭内数据，可编辑自己的允许字段。
- 非成员不可访问 family 数据。

失败表现：

- member 越权修改他人档案。
- 非成员读取 family 内容。
- 页面直接暴露原始权限错误。

关联表：

- `family_memberships`
- `person_profiles`
- `family_outputs`
- `family_meetings`

### 路径 9：private visibility 验证

操作步骤：

1. 账号 A 创建 private 故事、相册、议事、成果物、日历事件。
2. 账号 B 作为普通 member 登录查看。
3. 账号 A 或管理员账号查看。

预期结果：

- private 内容仅创建者和对应管理员可见。
- family 和 public 在当前版本仍限制为 family 成员可见。

失败表现：

- 普通 member 可看到他人 private 内容。
- 非成员可看到 public 内容。

关联表：

- `family_stories`
- `family_photos`
- `family_meetings`
- `family_outputs`
- `family_calendar_events`

### 路径 10：异常路径验证

操作步骤：

1. 未登录访问 `/family`、`/family/tree`、`/family/reminders`。
2. 使用无效邀请链接访问 `/claim/[token]`。
3. 使用已认领邀请链接再次认领。
4. 暂时移除本地 Supabase 环境变量后访问主要页面。

预期结果：

- 未登录跳转 `/login?redirect=当前路径`。
- 无效或已认领邀请给出友好提示。
- 未配置环境变量时页面不崩溃。
- 不显示 `Auth session missing!`。

失败表现：

- 页面白屏。
- 直接显示 Supabase 原始错误。
- redirect 丢失。

关联表：

- `invite_tokens`
- `profiles`
- `family_memberships`

## 四、验收标准

每条路径通过需同时满足：

- 操作步骤可由真实测试用户完成。
- 预期结果与页面展示、数据库记录一致。
- 失败表现未出现，或已记录为缺陷。
- 关联表数据完整，无明显脏数据。
- `npx tsc --noEmit`、`npm run lint`、`npm run build` 全部通过。
