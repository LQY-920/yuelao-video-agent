# Benchmark node Implementation Plan

> For agentic workers: execute the approved H001 increment in this feature branch. Only the owner writes project files; reviewers remain read-only.

**Goal:** 可点击、可保存、可追溯的对标拆解原型。
**Architecture:** 原生 ES modules + IndexedDB；样例和真实任务分离；纯数据层提供版本与引用约束；静态 HTTP 预览。
**Tech Stack:** Node.js 22、HTML/CSS/JavaScript、浏览器 IndexedDB、Node test runner。无第三方运行依赖。

- [x] 核对 H001 与现有工程；创建 GitHub 公开仓库与 feat/benchmark-analysis。
- [x] 设置并回读 main 的 PR 保护与管理员更新规则集。
- [x] dist/domain.js：任务、材料、报告、内容卡、导出；tests/domain.test.mjs 验证隔离、引用和快照。
- [x] dist/storage.js：IndexedDB 保存 Blob；错误向界面传播。
- [x] dist/demo.js：只读历史案例，来源与缺口明确，不加入实时指标。
- [x] dist/index.html、styles.css、app.js：输入、材料、报告、内容卡、导出、响应式布局。
- [x] scripts/server.mjs：仅托管 dist，拒绝越界路径；npm run check 与 npm test。
- [x] 浏览器验收正常流程和材料不足流程；工具不可用时明确留空验收状态。
- [ ] docs/STATUS.md、PITFALLS.md、仓库权限记录与 README；提交分支并开 PR，不自动合入。
