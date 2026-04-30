# 吾家祠堂 App

吾家祠堂 App 的产品定位是：

家族关系操作系统 + 数字家堂 + 家族记忆资产库。

## 当前功能

- 姓氏入口
- 创建数字家堂
- 三代家谱
- 添加亲属
- 邀请认领
- 成员列表
- 家人档案
- 家堂设置
- 家族故事
- 家族相册
- 家族议事
- 议事投票
- 家族日历
- 生日提醒
- 家庭节点提醒中心
- 成果物预览

## 技术栈

- Next.js
- TypeScript
- Tailwind CSS
- Supabase
- App Router

## 本地运行

```bash
npm install
npm run dev
npm run lint
npm run build
```

默认开发服务端口由 `package.json` 中的 `dev` 脚本控制。

## 环境变量

本地需要创建 `.env.local`：

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

注意：

- 不要提交 `.env.local`
- 不要使用 `service_role` key
- 不要把真实密钥写进代码

## 数据库迁移

Supabase migrations 位于：

```text
supabase/migrations/
```

执行时需在 Supabase SQL Editor 按顺序执行。执行前请确认目标项目正确，执行后再进行注册、创建家堂、邀请认领等真实流程测试。

## 当前版本边界

当前版本不做：

- 支付
- IM
- 开放社区
- 大宗祠
- 纪念馆
- 数字牌位
- 上香供奉
- 募捐捐款
- 宗教化功能
- 直播祭拜
- 祭拜商城
- 短信提醒
- 微信模板消息
- Push 推送

统一使用“数字家堂、家族关系、家人档案、家族记忆、纪念日、家族日历、家庭节点、生日提醒、家庭聚会、家族故事、家族相册、家族议事、成果物、邀请认领”等表达。
