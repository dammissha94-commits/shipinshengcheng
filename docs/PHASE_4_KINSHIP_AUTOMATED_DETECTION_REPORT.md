# 第四阶段 C4：中文亲属称谓自动检测报告

## 1. 检测目标

对中文亲属称谓接入做自动化检测，确认当前版本在可自动化范围内是否存在构建失败、核心路由白屏、adapter 边界破坏、业务页面泄露技术字段、禁止方向误入等问题。

本次检测不修改业务代码、不修改数据库、不新增 migration、不调整 RLS、不新增依赖。

## 2. 检测时间

2026-05-08

## 3. 检测方式

| 检测项 | 方法 | 结果 |
| --- | --- | --- |
| TypeScript | `npx tsc --noEmit` | 通过 |
| ESLint | `npm run lint` | 通过，存在 2 个既有 warning |
| Production build | `npm run build` | 通过 |
| 本地路由烟测 | `Invoke-WebRequest http://localhost:3001/...` | 通过 |
| kinship adapter 边界 | PowerShell `Select-String` 源码扫描 | 通过 |
| 技术字段泄露 | 扫描业务页面 `.source` / `KinshipResult.source` | 未发现 |
| 禁止方向扫描 | 扫描 `src/` 业务源码 | 未发现业务功能入口 |

## 4. 浏览器自动化说明

原计划使用 Codex in-app browser 做页面级自动检测，但当前本机 Node 版本为 `v22.20.0`，browser runtime 要求 `>= v22.22.0`，因此浏览器自动化未能启动。

本次已切换为替代检测：

- HTTP 路由烟测
- 源码边界扫描
- TypeScript / lint / build 硬校验

该限制不影响项目构建，但意味着本报告不能替代真实浏览器中的逐项视觉与交互校对。

## 5. 路由烟测结果

| 路由 | HTTP 状态 | 是否返回 HTML | 是否发现 Next 错误覆盖层 |
| --- | --- | --- | --- |
| `/` | 200 | 是 | 否 |
| `/login` | 200 | 是 | 否 |
| `/family` | 200 | 是 | 否 |
| `/family/members` | 200 | 是 | 否 |
| `/family/tree` | 200 | 是 | 否 |
| `/family/tree/graph` | 200 | 是 | 否 |
| `/family/statistics` | 200 | 是 | 否 |
| `/family/output` | 200 | 是 | 否 |
| `/family/calendar` | 200 | 是 | 否 |
| `/family/meetings` | 200 | 是 | 否 |

结论：自动路由烟测未发现白屏、500、Next.js error overlay 或 HTML 缺失。

## 6. kinship adapter 边界检测

| 检查项 | 结果 |
| --- | --- |
| `relationship-ts` 是否只由 adapter 直接 import | 通过 |
| 直接 import 文件 | `src/lib/kinship/kinship-adapter.ts` |
| 业务页面是否直接 import `relationship-ts` | 未发现 |
| 业务页面是否通过 adapter 使用称谓能力 | 通过 |
| 业务页面是否展示 `KinshipResult.source` | 未发现 |

已检测到的业务页面 adapter 接入：

- `src/app/family/members/[id]/page.tsx`
- `src/app/family/members/page.tsx`
- `src/app/family/tree/page.tsx`
- `src/app/family/tree/graph/page.tsx`

## 7. fallback 规则自动检测

源码扫描确认以下保守规则仍存在：

| 场景 | 预期 fallback | 自动检测结果 |
| --- | --- | --- |
| `sibling_of` 无性别 | 兄弟姐妹 | 存在 |
| `grandparent_of` 无性别 | 祖辈 | 存在 |
| 祖辈视角下孙辈无性别 | 孙辈 | 存在 |
| kinship 计算失败 | 回退原有 label / fallback | 存在 |

注意：自动检测只能确认代码中存在这些规则，不能确认真实家庭语境下所有显示都自然准确。

## 8. 禁止方向扫描

源码扫描发现相关词仅出现在产品边界声明或注释中，例如：

- 不做祭祀化
- 不做开放社区
- 不做支付
- 不使用宗教/祭祀化元素

未发现以下方向作为业务功能入口：

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

## 9. 硬校验结果

| 命令 | 结果 | 说明 |
| --- | --- | --- |
| `npx tsc --noEmit` | 通过 | 无 TypeScript 错误 |
| `npm run lint` | 通过 | 2 个既有 warning |
| `npm run build` | 通过 | Next.js 16.2.4 Turbopack 构建成功 |

既有 warning：

- `src/app/family/tree/graph/page.tsx`：`Network` unused
- `src/app/family/tree/page.tsx`：`Link` unused

## 10. kinship 自测运行限制

尝试执行：

```bash
node --experimental-transform-types src/lib/kinship/kinship.test.ts
```

结果未通过，原因是裸 Node 的实验性 TypeScript runner 无法解析测试文件中的无扩展名 TypeScript import：

```text
Cannot find module ... kinship-adapter
```

判断：

- 这不是业务构建失败。
- `npx tsc --noEmit` 已通过。
- `npm run build` 已通过。
- 如果后续希望命令行直接运行该测试，应单独增加测试运行方式，但当前阶段不新增依赖、不改配置。

## 11. 自动检测结论

| 项目 | 结论 |
| --- | --- |
| 是否发现 P0 | 否 |
| 是否发现 P1 | 自动检测范围内未发现 |
| 核心路由是否可访问 | 是 |
| build 是否通过 | 是 |
| kinship adapter 边界是否保持 | 是 |
| fallback 是否保留 | 是 |
| 是否发现技术 source 泄露 | 否 |
| 是否发现禁止方向业务入口 | 否 |
| 是否可替代真实家庭人工校对 | 否 |

## 12. 不能由自动检测替代的内容

以下内容仍需真实家庭人工确认：

- 某个家庭成员称谓是否符合真实家庭习惯。
- 丈夫、妻子、配偶等称谓在具体语境下是否自然。
- 兄弟/姐妹是否需要进一步区分哥哥、弟弟、姐姐、妹妹。
- 祖父/祖母是否需要区分外祖父/外祖母。
- 地域称谓差异是否影响理解。
- 真实账号下图谱筛选、高亮、导出交互是否完全符合预期。

## 13. 下一步建议

当前自动检测未发现 P0/P1。

下一步建议执行：

**第四阶段 C6：称谓自动检测通过归档**

但在真实家庭人工填写完成前，不建议声明“称谓人工校对通过”，只能声明“自动检测通过”。
