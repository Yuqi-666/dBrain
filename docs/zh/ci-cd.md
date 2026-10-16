# CI/CD 与版本发布

## 控制权与分支

仓库源码公开，但开发和发布决策由所有者独自掌握。不接受外部 PR。GitHub 仍允许其他人为公开仓库创建 PR；所有者会关闭未经邀请的 PR。漏洞按 [SECURITY.md](../../SECURITY.md) 私下报告。依赖更新由所有者选择并提交；不启用 Dependabot 版本更新 PR。

`develop` 是日常开发分支。所有者可以直接提交，也可以把仓库内的 `feature/*` 或 `fix/*` 分支合并进来。提交遵循 Conventional Commits。每次推送到 `develop` 或 `main`，以及仓库内部针对这两个分支的 PR，都会运行 CI。fork PR 不运行 `checks` 作业。`main` 保存晋升后的发行历史。CI 通过后，用仓库内部 PR 和**合并提交**将 `develop` 晋升到 `main`；squash 或 rebase 会使打标签的提交不再属于 `main` 历史。所有者可以在晋升前给 `develop` 上的提交打发行标签。

首次使用前，先把这些工作流文件合入 `main`，再推送新版本标签。GitHub 从默认分支读取 `workflow_run` 工作流文件。

`checks` 作业从锁文件安装依赖，运行 `release:check`、类型检查、lint 基线、发行测试、Web/Server 构建和 actionlint；令牌为只读。推送 `develop` 或 `main` 本身不会创建发行。

## 版本与候选

使用语义化版本。`fix` 通常增加 PATCH，兼容的 `feat` 增加 MINOR，破坏性改动增加 MAJOR。`0.x` 阶段的破坏性改动也可增加 MINOR，但必须在发行说明中写明。在 `develop` 上运行 `pnpm release:version VERSION`，同步 `scripts/release/release.json`、桌面包元数据和 Tauri 配置。在 `release.json` 中声明所有目标桌面平台与容器平台，并启用要发行的产品。运行 `pnpm release:check` 和相关测试。

版本提交进入 `develop` 后，所有者亲自为该提交创建并推送 `vVERSION`。先确认版本高于所有现有版本标签。标签推送自动触发 `release-candidate.yml`：它验证标签位于 `develop` 历史中，在干净 runner 上构建所有声明的容器平台，以及签名密钥齐全的桌面目标，并组装 `candidate-RUN_ID-ATTEMPT`。仍可从**标签 ref** 手动启动工作流做指定目标的重试；手动重试不会自动创建草稿。标签 ruleset 禁止移动或删除版本标签。

标签触发的候选成功后，`release.yml` 通过 `workflow_run` 自动运行。它检查已完成的候选运行、标签、版本、资产、签名和镜像摘要，然后创建 GitHub Release **草稿**。草稿尚未公开；已有发行不会被覆盖。容器镜像在正式发布前使用摘要引用。

通过仓库内部 PR 以合并提交把 `develop` 晋升到 `main`，使标签提交仍是 `main` 的祖先。检查草稿并完成产品验收。准备公开时，在 `main` 手动运行 `release.yml`，输入候选 run ID、标签以及 `publish=true`。受保护的 `release` 环境要求所有者审查。发布步骤晋升容器标签，并公开草稿。标签推送或分支合并都不会直接公开发行。

```bash
pnpm release:version VERSION
pnpm release:check
node scripts/release/assert-next-version.mjs
git tag vVERSION
git push origin vVERSION
# 候选成功后，用合并提交把 develop 合入 main。
gh run list --workflow release-candidate.yml
gh workflow run release.yml --ref main -f candidate_run_id=RUN_ID -f tag=vVERSION -f publish=true
```

可选的部署更新器在启用后关注成功的标签候选。它可能在 `main` 晋升前部署候选，因此只应在接受此时序的测试主机上启用。

## 仓库策略

`pnpm gate:policy --repo Yuqi-666/dBrain` 打印计划。工作流合并且 GitHub 上首次出现 `checks` 后，所有者运行 `pnpm gate:policy --apply --repo Yuqi-666/dBrain`。脚本设置合并提交及合并后删除分支；启用 Issues、保持 Discussions 关闭；将默认 `GITHUB_TOKEN` 权限设为只读，并禁止 Actions 批准 PR。`develop` ruleset 允许所有者直接推送，但禁止强推和删除。`main` ruleset 要求内部 PR、最新 `checks` 和讨论已解决，并禁止强推和删除。`v*` 标签 ruleset 禁止重写和删除标签。脚本把所有者设为 `release` 环境审查者。签名密钥放在无需审查的 `candidate` 环境，使标签构建能自动启动；`release` 环境只控制正式发布。私下漏洞报告、Dependabot 安全提醒和安全修复仍启用。

若要包含所有桌面目标，在 `candidate` 环境配置 `TAURI_SIGNING_PRIVATE_KEY`、`TAURI_SIGNING_PRIVATE_KEY_PASSWORD`、`WINDOWS_CERTIFICATE`、`WINDOWS_CERTIFICATE_PASSWORD`、`APPLE_CERTIFICATE`、`APPLE_CERTIFICATE_PASSWORD`、`APPLE_SIGNING_IDENTITY`、`APPLE_API_PRIVATE_KEY`、`APPLE_API_KEY` 和 `APPLE_API_ISSUER` 密钥。某桌面目标缺少所需签名密钥时，对应构建会跳过，作业摘要会列出被跳过的目标；其他桌面目标和容器构建继续。若没有任何产品可构建，候选会给出明确错误。当前仓库没有签名密钥，因此标签候选目前只有容器产物。

GitHub ruleset 无法对公开仓库表达“仅接受该所有者的 PR”。所有者控制合并，并关闭未经邀请的 PR。旧 ruleset 的要求可能叠加，需人工检查。旧本地 gate 和 pre-push 钩子只是可选的历史工具，不属于新流程。

## 安全与可复现性

Actions 固定到提交。候选与发布作业分别获得所需写权限。Server smoke 测试使用隔离数据。部署见[运维手册](operations.md)，桌面检查见[开发手册](development.md)。
