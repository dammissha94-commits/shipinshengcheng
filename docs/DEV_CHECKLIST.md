# 吾家祠堂开发检查清单

每次开发完成后必须检查：

1. `npx tsc --noEmit`
2. `npm run lint`
3. `npm run build`
4. 是否新增禁用词
5. 是否误写 `service_role` key
6. 是否破坏 `.env.example`
7. 是否破坏 Supabase RLS
8. 是否破坏登录 redirect
9. 是否破坏 fallback
10. 是否有 `Auth session missing` 直接暴露
11. 是否有 `localStorage` / mock 混入真实页面
12. 是否有未提交 migration
13. 是否需要人工执行 SQL
14. 是否需要更新 README
15. 是否需要更新测试计划

## 真实测试前必须确认

1. `.env.local` 正确连接 wujiacitang Supabase 项目
2. migrations 已全部执行
3. Supabase Auth Email 设置符合本地测试要求
4. `profiles` insert policy 正常
5. invite claim RPC 正常
6. private visibility RLS 正常
7. owner / member / 非成员权限正常
8. `npx tsc --noEmit`、`npm run lint`、`npm run build` 通过
9. Git 工作区 clean
10. 测试账号准备完成
