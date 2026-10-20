# GitHub 权限与 main 核验

检查日期：2026-10-20。
仓库：https://github.com/LQY-920/yuelao-video-agent （public）

- 默认分支 main；所有者 LQY-920。
- repo.permissions.admin=true；协作者列表返回 LQY-920 role_name=admin，未出现其他协作者。
- main.required_pull_request_reviews.required_approving_review_count=1。
- main.enforce_admins.enabled=false。
- main.allow_force_pushes.enabled=false；allow_deletions.enabled=false。
- 启用规则集 [main-admin-only-updates](https://github.com/LQY-920/yuelao-video-agent/rules/25453826)，ID 25453826，enforcement=active。
- conditions.ref_name.include 精确为 refs/heads/main，exclude 为空。
- rules 包含 update（Restrict updates）。bypass_actors 仅 RepositoryRole 5（管理员），bypass_mode=always。
- 实际 GET rules/branches/main 返回该 update 规则，确认匹配。
- invitations 数量 0；本轮暂不邀请。

配置回读已完成；没有普通 Write 协作者，未以 Write 身份测试推送/合并被拒绝。不把管理员能绕过的配置描述成管理员绝对无法绕过。最终合入仍由所有者决定。

单独 owner permission 端点两次遇到网络超时，因此依据 repo permissions 和实际协作者列表确认 Admin，不将超时请求记为成功。

参考：[GitHub 分支保护](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)、[规则集 API](https://docs.github.com/en/rest/repos/rules)。
