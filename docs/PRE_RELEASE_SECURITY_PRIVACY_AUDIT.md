# 上线前安全与隐私审计

## 1. 审计目标

判断吾家祠堂 APP 当前版本是否可以进入私密家庭 Beta 试用，以及正式上线前还需要处理哪些安全与隐私风险。

本次审计只检查本地代码、环境变量模板、migration、RLS 线索和产品边界，不修改业务代码、不修改数据库、不新增 migration。

## 2. 审计结论

| 结论项 | 结果 |
| --- | --- |
| 是否可进入小范围 Beta | 可以 |
| 是否可公开上线 | 暂不建议 |
| 是否发现 P0 | 未发现 |
| 是否发现 P1 | 发现 2 项隐私/上线前风险 |
| 是否需要数据库修复 | 正式上线前建议需要 |
| 是否需要立即停止 Beta | 不需要，但需限制照片敏感度和测试范围 |

## 3. 环境变量与密钥

| 检查项 | 结果 |
| --- | --- |
| `.env.example` 是否存在 | 是 |
| `.env.example` 是否包含真实密钥 | 未发现 |
| `.env.local` 是否存在 | 是 |
| `.env.local` 是否被 git 跟踪 | 否 |
| `.gitignore` 是否忽略 `.env.local` | 是 |
| 是否发现 service role key 暴露 | 本地源码扫描未发现 |

`.env.example` 当前仅包含：

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## 4. Supabase / RLS 审计

本地 migration 显示多张业务表已启用 RLS，并包含 family member / admin / creator 相关 policy。

已看到 RLS 线索：

- `profiles`
- `family_spaces`
- `family_memberships`
- `person_profiles`
- `person_relations`
- `invite_tokens`
- `action_logs`
- `family_calendar_events`
- `family_meetings`
- `family_meeting_votes`
- `family_meeting_opinions`
- `family_outputs`
- `biography_records`

## 5. P1 风险

### P1-1：family photos Storage bucket 当前为 public

文件：

`supabase/migrations/20260503_p0c_photo_upload_storage.sql`

当前 migration 中存在：

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('family-photos', 'family-photos', true, ...);

create policy "family_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'family-photos');
```

风险：

- 吾家祠堂定位是私密数字家堂。
- 家族相册可能包含真实家庭照片。
- 如果 bucket 为 public，图片 URL 一旦泄露，可能绕过家庭成员权限。

影响：

- 不建议在正式上线前保留 public read。
- Beta 期间不建议上传高度敏感照片。

建议：

1. 正式上线前新增修复 migration。
2. 将 `family-photos` bucket 改为 private。
3. Storage object policy 改为 family member 可读。
4. 前端改为使用 signed URL 或受控下载。
5. 不使用 service_role 绕过 RLS。

### P1-2：“公开可见”文案可能造成误解

位置：

- `/family/calendar`
- `/family/meetings`
- 相关 visibility 类型与 policy

风险：

- 当前产品定位是私密家堂。
- 用户看到“公开可见”可能理解为互联网公开。
- 从 migration 看，多数 public visibility 仍依赖 family member 条件，但文案容易造成认知风险。

建议：

1. 后续将“公开可见”改为“家堂内公开”或“全家堂可见”。
2. 对外部公开能力保持禁用。
3. 不新增陌生人访问或开放社区。

## 6. P2 风险

| 编号 | 风险 | 说明 | 建议 |
| --- | --- | --- | --- |
| P2-1 | 中文称谓真实人工校对未完成 | 自动检测通过，但真实家庭语境仍需确认 | 继续填写 C4 表格 |
| P2-2 | 当前工作区大量未提交 | 不利于回滚与版本封板 | Beta 前整理提交 |
| P2-3 | 线上 Supabase policy 未实库核对 | 本地 migration 不等于线上状态 | 上线前执行 SQL 检查 |
| P2-4 | 删除/隐藏/更正体验需继续复核 | 部分能力存在，但需真实流程验证 | 纳入 Beta 观察 |

## 7. 禁止方向复核

本地源码扫描未发现以下方向作为业务功能入口：

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

说明：

- 部分文档或注释中会出现禁止词，用于声明“不做该方向”，不属于业务功能入口。

## 8. 合规与隐私检查

| 检查项 | 当前判断 |
| --- | --- |
| 是否展示手机号 | 源码扫描未发现明确手机号展示功能 |
| 未认领亲属是否为关系占位 | 是，存在 claim_status |
| 是否有 private visibility | 是 |
| 是否有家庭成员权限隔离 | migration 与服务层均有相关逻辑 |
| 是否存在删除能力 | 部分模块存在 delete policy / 删除逻辑 |
| 是否存在隐藏状态 | `ClaimStatus` 包含 hidden |
| 是否存在公开相册风险 | 是，见 P1-1 |

## 9. Beta 使用建议

在 P1-1 修复前，Beta 仍可进行，但必须限制：

- 不上传高度敏感家庭照片。
- 不公开传播邀请链接。
- 不做陌生用户开放注册推广。
- 不把 Beta 版本宣传成正式上线版本。
- 每轮测试后检查是否有非成员访问数据的异常。

## 10. 上线前必须完成

正式上线前建议至少完成：

1. 修复 family photos Storage public read。
2. 将“公开可见”文案改为“家堂内公开”或“全家堂可见”。
3. 执行线上 Supabase RLS SQL 审计。
4. 整理当前 git 工作区并打 beta tag。
5. 完成真实家庭称谓人工校对。
6. 完成用户删除、隐藏、更正路径复核。

## 11. 最终判定

当前版本可以进入：

`phase-4-private-family-beta`

但正式上线前必须先处理 P1 隐私风险，尤其是 family photos Storage public read。
