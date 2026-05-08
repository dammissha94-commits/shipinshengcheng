# 第四阶段：家族相册私密存储修复记录

## 1. 修复目标

修复 `family-photos` Storage bucket 公开读导致的隐私风险，让家族相册图片只对所属家堂的 active family member 可访问。

本次不新增功能，不修改业务方向，不引入支付、IM、开放社区、祭祀化、宗教化、募捐、数字牌位等方向。

## 2. 真实原因

早期 photo upload migration 将 `family-photos` bucket 设置为 `public = true`，并创建了 `family_photos_public_read` policy。

这会让图片 URL 具备公开读取风险，不符合“私密数字家堂”和“家族记忆资产库”的产品定位。

## 3. 修复内容

### Storage migration

新增：

- `supabase/migrations/20260508_fix_family_photos_private_storage.sql`

修复策略：

- 将 `family-photos` bucket 设置为 private。
- 删除旧的公开读取 policy。
- 新增 active family member 才能 select 的 Storage RLS policy。
- 新增 active family member 只能上传到自己 family folder 的 insert policy。
- 保留 uploader 删除自己文件的 delete policy。
- 不删除已有对象。
- 不关闭 RLS。
- 不使用 service_role。

### 前端上传

更新：

- `src/app/family/photos/page.tsx`

调整：

- 不再由前端创建公开 bucket。
- 上传成功后不再保存 public URL。
- 新上传照片只保存 Storage object path，例如：`{family_id}/{timestamp}-{filename}`。
- bucket 未创建或权限未配置时，显示可理解的错误提示。

### 服务层读取

更新：

- `src/lib/services/photo-service.ts`

调整：

- `listFamilyPhotos()` 返回前生成短期 signed URL。
- `createFamilyPhoto()` / `updateFamilyPhoto()` / `archiveFamilyPhoto()` 返回前生成 signed URL。
- 已存在的 Supabase public URL 会尝试解析回 object path 后生成 signed URL。
- 外部手工填写的图片 URL 不强制转换，保持原值。
- 签名失败时不抛出 Supabase 原始错误，避免页面白屏。

## 4. 需要执行的 SQL

需要在 Supabase SQL Editor 执行：

- `supabase/migrations/20260508_fix_family_photos_private_storage.sql`

执行后才会真正关闭 `family-photos` 的公开读取。

## 5. 对现有数据的影响

- 不删除已有图片对象。
- 不删除 `family_photos` 数据行。
- 已保存为 Supabase public URL 的历史记录，会在服务层尽量转换为 signed URL。
- 新上传记录将保存 object path，而不是 public URL。

## 6. 验收建议

执行 migration 后验证：

1. family member 可以打开 `/family/photos`。
2. family member 可以上传照片。
3. family member 可以查看所属家堂照片。
4. 非 family member 无法通过 Storage policy 读取图片对象。
5. 旧的 public URL 不再公开访问。
6. 页面不显示 Supabase 原始错误。

## 7. 当前边界

本次只修复相册存储隐私风险，不处理：

- 相册可见范围文案优化。
- 图片压缩。
- 图片 CDN 性能优化。
- 相册分组或标签。
- 批量上传。
