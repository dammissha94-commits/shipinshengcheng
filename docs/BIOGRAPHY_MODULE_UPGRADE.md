# 生平传记模块升级

## 新增数据库表

`biography_records` — 每人可有多条生平记录，按时间排序。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| person_id | uuid | 关联人物 |
| family_id | uuid | 关联家堂 |
| title | text | 标题（如：出生、考上大学） |
| content | text | 正文 |
| event_year/month/day | int | 发生时间 |
| location | text | 地点 |
| image_url/audio_url | text | 媒体链接 |
| visibility | enum | private/direct_family/branch_family/family/admin_only |
| recorded_by | uuid | 创建人 |
| relationship_to_person | text | 代录人与被记录人的关系 |
| authorization | enum | self/authorized/pending/deceased_manager |
| is_modifiable_by_subject | boolean | 是否允许被记录人修改 |

## 权限规则

- 家族成员可查看（按 visibility 字段过滤）
- 创建者/记忆管理员/家堂管理员可删除
- 代录记录标记 authorization='authorized'
- 已故亲人记录 authorization='deceased_manager'

## 禁止事项

- 不上香、不献花、不虚拟供品、不功德榜、不孝心排行

## 适老化

- 三按钮快捷录入："说一段故事"、"记一张照片"、"帮家人记录"
- 表单只要求标题、年份、一段文字
- 不强制填写月份/日期/地点
