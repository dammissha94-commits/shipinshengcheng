# 家族相册升级方案

## 研究来源

| 项目 | 借鉴内容 | 适用性 |
| --- | --- | --- |
| [shadcn.io Photo Album Gallery](https://www.shadcn.io/blocks/gallery-photo-album) | Masonry 网格布局、page-flip 过渡、卡片设计 | ⭐⭐⭐⭐⭐ 同 Tailwind 栈 |
| [gyng/album](https://github.com/gyng/album) | AI 标签、EXIF 解析、地图模式 | ⭐⭐⭐ 需 Python 后端 |
| [Ducky](https://github.com/AlejandroV01/Ducky) | Next.js + Supabase + 协作相册 | ⭐⭐⭐⭐ 最近技术栈 |
| [Numeric Citizen Flickr Rebuild](https://blog.numericcitizen.me/2026/01/20/im-rebuilding-flickr.html) | 三种网格布局(comfortable/compact/masonry)、lightbox | ⭐⭐⭐⭐⭐ 纯 Next.js |

## 当前状态

- `src/app/family/photos/page.tsx` — 2列网格 + URL输入 + 表单
- `family_photos` 表 — 支持 image_url、title、description、photo_year
- 无真实文件上传（仅 URL）
- 无 lightbox 查看
- 无 masonry 瀑布流布局

## 升级内容（不改数据库）

| 功能 | 实现方式 |
| --- | --- |
| Masonry 瀑布流布局 | CSS columns 实现，响应式 2/3/4 列 |
| 图片 Lightbox 查看 | 点击照片展开全屏浮层，支持左右滑动 |
| 年份筛选 | 已有 photo_year 字段，客户端 filter |
| 改进 PhotoCard | 更大图片区域、hover 缩放、更好的信息层级 |
| 相册统计 | 顶部统计卡片：照片总数、覆盖年份 |

## 不做的

- ❌ 真实文件上传（需 Supabase Storage + RLS 改动，P1）
- ❌ AI 标签/人脸识别（需额外后端）
- ❌ EXIF 地图（需 Leaflet 依赖）
- ❌ 视频支持（family_photos 表无 video 字段）
