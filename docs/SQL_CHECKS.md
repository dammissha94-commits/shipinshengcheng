# 吾家祠堂测试数据核对 SQL

下面的语句可直接放到 Supabase SQL Editor 中执行。  
如果只想看某一个测试家堂，把 `where family_id = '<family-uuid>'` 加到对应语句里即可。

## 1. 查看最近注册用户

```sql
select
  id,
  email,
  created_at,
  last_sign_in_at
from auth.users
order by created_at desc
limit 20;
```

说明：用于确认最近注册账号是否已经创建到 Supabase Auth 中。

## 2. 查看 profiles

```sql
select *
from public.profiles
order by created_at desc
limit 50;
```

说明：检查用户资料是否自动补齐，是否存在 display_name、elder_mode 等字段异常。

## 3. 查看 family_spaces

```sql
select *
from public.family_spaces
order by created_at desc
limit 50;
```

说明：确认测试家堂是否创建成功，以及 visibility、status、founder_user_id 是否正确。

## 4. 查看 person_profiles

```sql
select *
from public.person_profiles
order by created_at desc
limit 100;
```

说明：查看家人节点是否录入成功，重点核对 claim_status、visibility、bound_user_id。

## 5. 查看 person_relations

```sql
select *
from public.person_relations
order by created_at desc
limit 100;
```

说明：核对亲属关系是否正确建立，重点查看 relation_type、status、is_primary。

## 6. 查看 invite_tokens

```sql
select *
from public.invite_tokens
order by created_at desc
limit 50;
```

说明：检查邀请认领链接是否生成、是否过期、是否已被认领。

## 7. 查看 family_memberships

```sql
select *
from public.family_memberships
order by created_at desc
limit 100;
```

说明：确认 owner / member / viewer 等角色是否正确写入，以及 join_status 是否为 active。

## 8. 查看 family_calendar_events

```sql
select *
from public.family_calendar_events
order by created_at desc
limit 100;
```

说明：核对生日同步、纪念日和家庭日历事件是否落库。

## 9. 查看 family_meetings

```sql
select *
from public.family_meetings
order by created_at desc
limit 100;
```

说明：确认家族议事是否创建成功，重点看 type、status、created_by。

## 10. 查看 family_meeting_votes

```sql
select *
from public.family_meeting_votes
order by created_at desc
limit 100;
```

说明：检查议事投票是否写入，重点看 meeting_id、family_id、voter_user_id。

## 11. 查看 family_meeting_opinions

```sql
select *
from public.family_meeting_opinions
order by created_at desc
limit 100;
```

说明：核对议事意见是否发布成功，重点看 stance、visibility、status。

## 12. 查看 family_outputs

```sql
select *
from public.family_outputs
order by created_at desc
limit 100;
```

说明：检查成果物预览数据是否生成，重点看 output_type、status、preview_data、generated_url。

## 13. 查看 action_logs

```sql
select *
from public.action_logs
order by created_at desc
limit 200;
```

说明：用于回溯关键动作日志，例如建堂、认领、创建内容、更新数据等。

## 建议的联查语句

### 13.1 查看某个家堂的核心数据概览

```sql
select
  fs.id as family_id,
  fs.display_name as family_name,
  count(distinct pp.id) as person_count,
  count(distinct pr.id) as relation_count,
  count(distinct it.id) as invite_count,
  count(distinct fce.id) as calendar_event_count,
  count(distinct fm.id) as meeting_count,
  count(distinct fmv.id) as vote_count,
  count(distinct fmo.id) as opinion_count,
  count(distinct fo.id) as output_count
from public.family_spaces fs
left join public.person_profiles pp on pp.family_id = fs.id
left join public.person_relations pr on pr.family_id = fs.id
left join public.invite_tokens it on it.family_id = fs.id
left join public.family_calendar_events fce on fce.family_id = fs.id
left join public.family_meetings fm on fm.family_id = fs.id
left join public.family_meeting_votes fmv on fmv.family_id = fs.id
left join public.family_meeting_opinions fmo on fmo.family_id = fs.id
left join public.family_outputs fo on fo.family_id = fs.id
group by fs.id, fs.display_name
order by max(fs.created_at) desc;
```

说明：适合快速判断一个测试家堂的数据是否完整，以及是否已经覆盖本阶段的主要模块。
