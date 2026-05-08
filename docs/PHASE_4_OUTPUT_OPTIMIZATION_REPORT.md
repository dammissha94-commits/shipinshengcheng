# 第四阶段 B：家堂档案性能与体验优化报告

## 1. 阶段名称

第四阶段 B：`/family/output` 家堂档案性能与体验优化

## 2. 阶段目标

- 降低家堂档案主页加载压力。
- 减少档案预览生成时的不必要查询。
- 优化 `/family/output`、`/family/output/new`、`/family/output/print` 的页面切换反馈。
- 保持现有功能边界，不新增业务模块。
- 不修改数据库、RLS、Supabase schema 或第三方依赖。

## 3. 优化前主要问题

| 问题 | 影响 | 等级 |
| --- | --- | --- |
| `/family/output` 使用完整 `family_outputs` 查询，包括 `preview_data` | 档案记录越多，主页加载和渲染压力越大 | P2 |
| `/family/output/new` 只需要权限判断，却复用了会拉取档案列表的查询 | 进入整理页时存在不必要请求 | P2 |
| `/family/output/print` 使用通用列表服务，读取字段偏多 | 打印版加载成本偏高 | P2 |
| 家族故事册预览复用记忆册预览逻辑 | 生成故事册时会额外读取照片数据 | P2 |
| 家堂档案路由缺少局部 loading 反馈 | 慢网络下用户容易误以为页面无响应 | P2 |
| 档案记录长列表一次性全部渲染 | 记录较多时首屏渲染压力增加 | P2 |

## 4. 已完成优化

### 4.1 家堂档案主页轻量化

涉及文件：

- `src/app/family/output/page.tsx`
- `src/lib/services/output-service.ts`

优化内容：

- 新增 `FamilyOutputListItem` 轻量列表类型。
- `/family/output` 只查询档案列表展示所需字段。
- 不再在主页查询完整 `preview_data`。
- 主页面定位调整为“档案入口 + 档案记录”，完整内容留给整理页和打印页。
- 档案记录默认只渲染最近 8 条。
- 档案较多时通过“查看更多档案”按需展开。

### 4.2 整理档案页权限查询轻量化

涉及文件：

- `src/app/family/output/new/page.tsx`
- `src/lib/services/output-service.ts`

优化内容：

- 新增 `canCreateFamilyOutputForCurrentUser()`。
- `/family/output/new` 进入页面时只判断当前用户是否有整理权限。
- 不再为了权限判断拉取全部档案记录。
- 生成过程中增加提示文案，说明正在整理哪类档案。

### 4.3 打印版档案查询轻量化

涉及文件：

- `src/app/family/output/print/page.tsx`
- `src/lib/services/output-service.ts`

优化内容：

- 新增 `getFamilyPrintOutputData()`。
- 打印页只查询打印所需字段。
- 家人、关系、故事、家庭节点仍保持并行读取。
- 不改变打印版现有展示结构和导出方式。

### 4.4 预览生成查询优化

涉及文件：

- `src/lib/services/output-service.ts`

优化内容：

- 记忆册预览只读取故事和照片摘要字段。
- 故事册预览不再复用记忆册预览。
- 故事册预览只查询故事数据，不再额外查询照片。
- 年鉴、记忆册、三代谱生成逻辑保持现有功能边界。

### 4.5 路由级 loading 反馈

新增文件：

- `src/app/family/output/loading.tsx`
- `src/app/family/output/new/loading.tsx`
- `src/app/family/output/print/loading.tsx`

优化内容：

- `/family/output` 增加局部 skeleton。
- `/family/output/new` 增加局部 skeleton。
- `/family/output/print` 增加打印版专属 loading 页面。
- 用户在慢网络或冷启动时能看到明确反馈。

## 5. 未修改内容清单

- 未修改数据库。
- 未新增 migration。
- 未修改 RLS。
- 未修改 Supabase schema。
- 未修改 `package.json`。
- 未修改 `package-lock.json`。
- 未新增第三方依赖。
- 未新增业务模块。
- 未改变家堂档案、整理档案、导出档案的核心流程。
- 未引入支付、IM、开放社区、祭祀化、宗教化、纪念馆、数字牌位、上香供奉、功德、法事、募捐、捐款方向。

## 6. 修改文件清单

| 文件 | 类型 | 说明 |
| --- | --- | --- |
| `src/app/family/output/page.tsx` | 修改 | 家堂档案主页轻量化、按需展开记录 |
| `src/app/family/output/new/page.tsx` | 修改 | 权限查询轻量化、生成过程提示 |
| `src/app/family/output/print/page.tsx` | 修改 | 使用打印页轻量数据包 |
| `src/app/family/output/loading.tsx` | 新增 | 家堂档案主页 loading |
| `src/app/family/output/new/loading.tsx` | 新增 | 整理档案页 loading |
| `src/app/family/output/print/loading.tsx` | 新增 | 打印版 loading |
| `src/lib/services/output-service.ts` | 修改 | 新增轻量查询类型和服务函数，优化预览查询 |

## 7. 验证结果

本阶段优化后已运行：

| 命令 | 结果 |
| --- | --- |
| `npx tsc --noEmit` | 通过 |
| `npm run lint` | 通过，保留 2 个既有 warning |
| `npm run build` | 通过 |

既有 warning：

- `src/app/family/tree/graph/page.tsx`：`Network` 未使用。
- `src/app/family/tree/page.tsx`：`Link` 未使用。

以上 warning 与本阶段家堂档案优化无关。

## 8. 验收路径

建议真实账号逐页检查：

| 路由 | 验收点 |
| --- | --- |
| `/family/output` | 页面可打开，档案列表首屏轻量展示，可查看更多 |
| `/family/output/new` | 页面可打开，权限判断正常，整理档案时有过程提示 |
| `/family/output/print` | 页面可打开，打印版数据正常展示，可使用浏览器另存为 PDF |

## 9. 剩余风险

- 真实性能仍需在真实 Supabase 数据量下复测。
- `/family/output/print` 仍会读取多个数据表，家族数据量很大时仍可能偏慢。
- 当前未引入分页查询，档案主页只是前端按需展开，后续可在数据量明显增长后再做服务端分页。
- 预览生成仍是同步点击生成，后续如数据量很大，可评估后台任务或分步生成，但当前阶段不做。

## 10. 下一步建议

第四阶段 B 可以先进入真实账号验收。

如果验收通过，建议下一阶段从以下方向选择一个：

1. 中文亲属称谓人工校对样本集。
2. Supabase RLS 回归审计。
3. `/family/output/print` 大数据量性能复测。
4. 清理既有 lint warning。

