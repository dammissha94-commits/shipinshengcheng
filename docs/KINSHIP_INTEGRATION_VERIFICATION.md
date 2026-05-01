# 中文亲属称谓适配层接入回归验收与阶段归档

## 1. 阶段名称

第三阶段第九步：中文亲属称谓接入回归验收与阶段归档。

## 2. 本阶段目标

在不修改数据库、不调整 RLS、不改变关系写入逻辑、不新增业务模块的前提下，完成中文亲属称谓适配层的低风险接入验收。

本阶段只验证并归档以下内容：

- relationship-ts 只能由 kinship adapter 间接使用。
- 业务页面只依赖 `src/lib/kinship/kinship-adapter.ts`。
- 称谓展示失败时保留原有 fallback。
- 已接入页面不改变查询、权限、关系写入、图谱布局、搜索、高亮、筛选、PNG 导出逻辑。
- 不引入祭祀化、宗教化、上香供奉、功德、法事、募捐、捐款、数字牌位、开放社区、IM、支付方向。

## 3. 已完成提交列表

- `b4a51ca add kinship label adapter`
- `3adb755 integrate kinship labels into member profile`
- `8f33d39 integrate kinship labels into member list`
- `7d0c9c0 integrate kinship labels into family tree`
- `4ea617b integrate kinship labels into relationship graph`

## 4. 新增依赖 relationship-ts 版本

当前 `package.json` 与 `npm ls relationship-ts --depth=0` 显示实际安装版本：

- `relationship-ts@0.1.1`

说明：当前许可证记录文件中保留了 relationship-ts 的 MIT License 信息。后续如调整依赖版本，应同步校准 LICENSES 记录中的版本字段。

## 5. License 记录路径

- `LICENSES/relationship-ts-LICENSE.md`

## 6. src/lib/kinship/ 文件说明

- `src/lib/kinship/kinship-types.ts`
  定义 kinship adapter 的稳定类型，包括 `KinshipResult`、`KinshipSource`、称谓路径参数等。不直接 import `relationship-ts`。

- `src/lib/kinship/kinship-labels.ts`
  定义本地关系与中文称谓映射、性别转换、fallback 标签、保守 RelationType 标签。不直接 import `relationship-ts`。

- `src/lib/kinship/kinship-adapter.ts`
  唯一直接 import `relationship-ts` 的文件。对外暴露稳定函数：`getKinshipLabel()`、`getReverseKinshipLabel()`、`getRelationPathLabel()`、`normalizeRelationType()`。

- `src/lib/kinship/kinship.test.ts`
  覆盖基础称谓、fallback、保守 RelationType 规则，验证 sibling/grandparent 的无性别保守输出。

## 7. 已接入页面

- `src/app/family/members/[id]/page.tsx`
- `src/app/family/members/page.tsx`
- `src/app/family/tree/page.tsx`
- `src/app/family/tree/graph/page.tsx`

## 8. 每个页面的接入范围

### 家人档案页

文件：`src/app/family/members/[id]/page.tsx`

接入范围：

- 仅在关联关系展示中使用 kinship adapter。
- 不改变家人档案查询。
- 不改变家人档案保存。
- 不改变生日同步。
- 不改变权限判断。
- 不显示 `KinshipResult.source`。

### 成员列表页

文件：`src/app/family/members/page.tsx`

接入范围：

- 仅在成员卡片关系标签中使用 kinship adapter。
- 不改变成员查询。
- 不改变成员筛选。
- 不改变成员排序。
- 不改变点击跳转。
- 不显示 `KinshipResult.source`。

### 三代谱页面

文件：`src/app/family/tree/page.tsx`

接入范围：

- 仅在三代谱节点关系称谓展示中使用 kinship adapter。
- 不改变三代谱数据查询。
- 不改变 `mapProfilesToTreePersons()` 结果。
- 不改变添加亲属入口。
- 不改变关系写入。
- 不显示 `KinshipResult.source`。

### 2D 家族关系图页面

文件：`src/app/family/tree/graph/page.tsx`

接入范围：

- 仅在边关系标签、关系筛选按钮、图例标签的展示文本中使用 kinship adapter。
- `edge.relationType` 原值不变。
- 不改变图谱节点构建。
- 不改变边构建。
- 不改变布局算法。
- 不改变搜索逻辑。
- 不改变一跳亲属高亮逻辑。
- 不改变关系类型筛选逻辑。
- 不改变 PNG 导出逻辑。
- 不显示 `KinshipResult.source`。

## 9. fallback 规则

- `getKinshipLabel()` 失败时回退到现有 `getRelationLabel()` 结果。
- `normalizeRelationType()` 使用保守中文称谓。
- 页面局部 helper 均使用 `try/catch` 或原有 label fallback，避免称谓计算失败导致白屏。
- 业务页面不读取、不展示 `KinshipResult.source`。
- 关系数据不足时不做强推断。

## 10. sibling_of / grandparent_of 保守规则

- `sibling_of` 无性别字段时显示“兄弟姐妹”。
- `sibling_of` 男性显示“兄弟”。
- `sibling_of` 女性显示“姐妹”。
- `grandparent_of` 无性别字段时显示“祖辈”。
- `grandparent_of` 男性显示“祖父”。
- `grandparent_of` 女性显示“祖母”。
- 当前人为祖辈、对方为孙辈且性别未知时，保守显示“孙辈”。

## 11. 未修改内容清单

本阶段验收确认未继续修改以下内容：

- 数据库表结构。
- Supabase migration。
- RLS policy。
- `src/lib/services/`。
- `src/types/domain.ts`。
- `src/types/service.ts`。
- `package.json`。
- `package-lock.json`。
- `src/lib/kinship/`。
- 关系写入逻辑。
- 添加亲属逻辑。
- 2D 图谱布局算法。
- 2D 图谱节点坐标计算。
- 2D 图谱搜索逻辑。
- 2D 图谱一跳亲属高亮逻辑。
- 2D 图谱关系筛选逻辑。
- 2D 图谱 PNG 导出逻辑。
- 支付、IM、开放社区、祭祀化、宗教化相关方向。

## 12. tsc / lint / build 结果

执行日期：2026-05-01

- `npx tsc --noEmit`：通过。
- `npm run lint`：通过。
- `npm run build`：通过。

构建确认页面包括：

- `/family/members`
- `/family/members/[id]`
- `/family/tree`
- `/family/tree/graph`

## 13. 剩余风险

- relationship-ts 只作为称谓辅助，不应成为业务关系判断来源。
- 当前 sibling/grandparent 仍采用保守规则，不做复杂路径推断。
- 2D 图谱只替换展示标签，复杂亲属链称谓暂未进入图谱路径计算。
- LICENSES 记录应在未来依赖版本升级时同步复核版本字段。
- 若后续扩展到搜索理解或关系高亮解释，仍应通过 adapter 新增稳定 API，避免业务页面直接依赖第三方库。

## 14. 下一阶段建议

1. 先完成真实家庭测试中的 P0/P1 回归验收。
2. 继续观察中文称谓是否帮助用户理解家人关系。
3. 若测试反馈稳定，再评估是否在搜索提示或关系高亮说明中小范围复用 adapter。
4. 暂不做复杂关系链推断，避免称谓错误影响用户信任。
5. 任何后续 relationship-ts 扩展，都应继续遵守“adapter 是唯一接触第三方库的文件”这一边界。
