# 吾家祠堂 App 页面美化设计系统

## 1. 设计目标

- 温润、克制、现代、清晰
- 有家庭文化感、有秩序感
- 不压抑、不陈旧、不复杂国风堆叠
- 中老年用户可读，年轻用户可接受
- 不为装饰而装饰，服务于"家族关系操作系统"的产品定位

## 2. 颜色规范

| 令牌 | Tailwind | 用途 |
| --- | --- | --- |
| 页面背景 | `bg-stone-50` | 全局背景，温暖不刺眼 |
| 卡片背景 | `bg-white` | 所有内容卡片 |
| 主色 | `bg-emerald-950` / `text-emerald-950` | 主按钮、重要标题、顶部导航 |
| 主色浅 | `bg-emerald-50` | 选中态、标签背景 |
| 辅色 | `text-stone-800` | 正文标题 |
| 边框 | `border-stone-200` | 卡片边框、分割线 |
| 弱文字 | `text-stone-500` / `text-stone-600` | 描述文字、次要信息 |
| 点缀 | `text-amber-600` / `bg-amber-50` | 强调/提醒/链接/高亮，少量使用 |
| 点缀深 | `text-amber-700` | hover 态 |
| 成功 | `text-emerald-600` / `bg-emerald-50` | 已完成、已认领 |
| 警告 | `text-amber-600` / `bg-amber-50` | 待处理、待认领 |
| 危险 | `text-red-500` / `bg-red-50` | 删除、错误 |
| 禁用 | `text-stone-400` / `bg-stone-100` | 不可用状态 |

禁止使用：
- 大红色大面积
- 金色大面积（只做少量点缀）
- 纯黑文字
- 高饱和背景

## 3. 字体层级

| 层级 | 类名 | 用途 |
| --- | --- | --- |
| H1 | `text-2xl sm:text-3xl font-bold tracking-tight` | 页面标题 |
| H2 | `text-lg sm:text-xl font-semibold tracking-tight` | Section 标题 |
| H3 | `text-base font-semibold` | 卡片标题 |
| Body | `text-sm sm:text-base text-stone-700` | 正文 |
| Caption | `text-xs sm:text-sm text-stone-500` | 辅助说明 |
| Eyebrow | `text-xs tracking-widest uppercase text-stone-400` | 分类标签 |

字体栈：`-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', sans-serif`

## 4. 间距规范

| 场景 | 类名 |
| --- | --- |
| 页面水平内边距 | `px-4 sm:px-6 lg:px-8` |
| 页面垂直内边距 | `py-6 sm:py-8 lg:py-10` |
| 区块间距 | `space-y-6` 或 `gap-6` |
| 卡片内间距 | `p-5 sm:p-6` |
| 组件间距 | `space-y-4` 或 `gap-4` |
| 紧凑间距 | `space-y-3` 或 `gap-3` |

页面最大宽度：
- 内容页：`max-w-6xl`
- 表单/详情页：`max-w-2xl`

## 5. 卡片规范

所有内容卡片统一使用：
```
rounded-2xl border border-stone-200 bg-white shadow-sm
```

卡片内部标题区与内容区用 `border-b border-stone-100` 分隔。

## 6. 按钮规范

| 变体 | 类名 |
| --- | --- |
| Primary | `bg-emerald-950 text-white hover:bg-emerald-900 rounded-xl` |
| Secondary | `border border-stone-300 bg-white text-stone-800 hover:bg-stone-50 rounded-xl` |
| Ghost | `text-stone-600 hover:bg-stone-100 hover:text-stone-900 rounded-xl` |
| Accent | `bg-amber-600 text-white hover:bg-amber-700 rounded-xl`（少量使用） |
| Danger | `bg-red-50 text-red-600 hover:bg-red-100 rounded-xl` |

尺寸：`h-10 px-4 text-sm`（默认）/ `h-12 px-5`（大按钮）

禁用态：`opacity-50 pointer-events-none`

## 7. 表单规范

输入框：
```
w-full rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm
focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20
placeholder:text-stone-400
```

标签：
```
block text-sm font-medium text-stone-700 mb-1.5
```

## 8. 空状态规范

- 居中布局
- 不使用人物剪影/祠堂简笔画/香炉等图标
- 推荐使用通用图标（文件、用户、列表）
- 标题简洁，描述一句话，不超过 20 字
- 可选操作按钮

禁止文案示例：
- "香火相传"、"家族兴旺"、"光宗耀祖"
- "魂归故里"、"世代永存"
- 任何包含"供奉、香火、功德、祈福、牌位"的文案

## 9. 禁止方向

### 视觉禁止
- 红色/金色大面积铺陈
- 龙纹、凤纹、祥云、回纹等传统装饰图案
- 牌位形制、香炉形制
- 烛台、纸钱、供品相关 icon
- 任何宗教符号（佛、道、十字架等）
- 家训/祖训/族规大字展示

### 文案禁止
- 祭祀化：供奉、上香、祭拜、扫墓
- 宗教化：功德、法事、祈福、超度
- 纪念馆化：音容宛在、永垂不朽、缅怀
- 宗族化：光宗耀祖、门楣、香火、传宗接代

### 功能禁止
- 支付
- IM / 聊天
- 开放社区 / 陌生人社交
- 募捐 / 捐款
- 数字牌位

## 10. 后续页面改造批次

### 批次 0（当前）：基础组件
- 新建 `src/components/wujia/` 组件库
- 不改任何业务页面

### 批次 1：全局 Shell 替换
- 将各页面的 `min-h-screen bg-cream` + 内联 header 替换为 `AppShell` + `PageHeader`

### 批次 2：卡片统一
- 将各页面内联卡片替换为 `SectionCard`
- 将快捷操作替换为 `QuickActionCard`

### 批次 3：状态统一
- 将各页面的 Badge/状态标签替换为 `StatusBadge`
- 将各页面的空状态替换为 `EmptyState`

### 批次 4：表单统一
- 将各页面的自定义表单替换为 `FormPanel` + `Input`
