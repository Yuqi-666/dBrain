# 构建与发布

当前产品为 0.1.0 内测版。自动化产物来自指定 commit 和 run，正式发布需要真实验收记录；工作流成功不等同于 GUI 和数据迁移已验收。

## 常规 CI

| 事件 | 行为 |
| --- | --- |
| main push，包括 PR 合并 | 按变更范围运行 |
| 面向 main / develop 的 PR：opened、synchronize、reopened、ready_for_review | 非草稿按变更范围运行 |
| 草稿 PR，包括 converted_to_draft | 跳过任务，不分配 runner |
| 普通分支或 develop push、版本标签 push | 不触发常规 CI |
| workflow_dispatch / 完整候选调用 | 完整检查 |

先由轻量 changes job 读取完整 Git diff，再决定质量与容器任务：

| 改动 | 检查范围 |
| --- | --- |
| 仅 .md、docs/、.agents/、Issue 模板、LICENSE 或 Dependabot 配置 | 仅 changes，不安装依赖 |
| 仅 apps/desktop/ 或 rust-toolchain.toml | changes + check，跳过容器 |
| 共享代码、锁文件、部署、工作流及其他路径 | changes + check，通过后再 containers |
| Dependabot PR | 按路径决定 check，但不运行 containers |
| 无法取得历史或可靠分类 | 完整检查 |

check 包含版本校验、工作流检查、类型、lint 增量门禁、回归测试、Server / Web 构建与后端 smoke。containers 是隔离 Compose 集成测试，不发布正式镜像。CI 不生成桌面安装器。

同一 PR / ref 新的自动 CI 取消旧运行。常规依赖升级当前暂停（open-pull-requests-limit 为 0、monthly 扫描），此前 14 个升级 PR 已关闭；不等于禁用安全更新。

## 构建缓存

当前保留 pnpm 下载缓存，并增加以下构建缓存。缓存命中只复用中间数据，检查、运行时准备、安装包生成和签名验证仍执行。

| 内容 | 缓存范围与隔离 |
| --- | --- |
| pnpm | setup-node 管理包缓存，按 OS / 架构与锁文件区分，仍运行 frozen-lockfile 安装 |
| Web Next.js | 仅 apps/web/.next/cache；按 OS / 架构、Node 与锁文件、相关源码区分，源码变化可回退到同工具链的旧增量缓存 |
| Desktop Next.js | 仅 apps/desktop/.next/cache；按四个桌面 target 分开，其余与 Web 策略相同 |
| Rust | Cargo 下载与依赖编译；按 target、签名模式、实际 rustc、Cargo 锁文件和环境区分；不保留项目自身与发行安装包 |
| Docker | Buildx GHA v2；pocketbase / server / web 各自按 amd64 / arm64 分开，常规 amd64 CI 与候选共享对应 scope |

Next.js、Rust、Docker 的可复用缓存只由默认分支构建写入，PR 和其他分支读取可访问的主线缓存。缓存不会包含 .env、签名私钥、数据库、附件或候选发行资产。Dockerfile 先依据 pnpm-lock.yaml / workspace 文件执行 pnpm fetch，再复制源码并离线安装；业务代码变动可复用依赖下载层。docs、README 和 release-artifacts 排除在 Docker 上下文外。

第一次冷构建仍需完整执行；只有成功构建后保存的缓存才供后续使用。GitHub 的访问范围、容量和淘汰规则仍适用，无法保证每次命中。Docker 缓存导出失败不会把构建成功改成失败；冷缓存与失效缓存均应回退正常构建。依赖、编译器或锁文件变化可能重建相应部分。

查看 Actions 日志中的 Restore / Save Next.js build cache、Restore Rust dependency build cache 及 Build cached image 步骤；Docker 的 CACHED 行表示某层复用。通过以下命令查看空间，清理时只删除已关闭 PR / 废弃分支对应缓存，不删除仍在使用的主线缓存：

```bash
gh cache list --repo Yuqi-666/dBrain --limit 100
```

需要整体失效时，审查修改 next-v1、dbrain-rust-v1 或 dbrain-v1 前缀，不将通过状态写成缓存。参考 [Next.js 缓存](https://nextjs.org/docs/app/guides/ci-build-caching)、[Docker GHA 缓存](https://docs.docker.com/build/cache/backends/gha/)、[Rust cache](https://github.com/Swatinem/rust-cache)。

## 本地检查记录与远端结果复用

当前没有“本地检查完成后 GitHub 自动跳过”的机制。可将本地日志保存为忽略的构建产物供排查，但提交一个 ci-passed 文件不能代替远端 CI：标记可修改，也无法证明工作树、依赖、OS 和工具版本与待审查提交一致。

后续如实现复用，应查询 GitHub 上可信工作流成功结果，逐项核对源码或相关内容哈希、锁文件、工作流 / 检查脚本版本及工具链，确认所需 job 真正执行成功。PR 检查可能针对合并结果，main 合并又生成新 commit，不能仅凭 PR head 或父提交通过就跳过集成检查。记录缺失、过期或输入变化时重新执行。

去重通常仍需轻量 runner 查询并输出状态，但可减少后续重任务。未执行的 job 不应伪报为新测试成功；手动完整候选与正式发行继续验证实际产物。远端结果复用目前未实现。

现有节省措施包括普通开发分支不触发、草稿不分配 runner、文档仅分类、按路径省略容器、取消过时运行和依赖缓存。开发中可先在短期分支做本地检查，准备审查时将 PR 转为 ready for review。缓存用于提速，不代表测试通过，见 [GitHub 缓存说明](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)。

## 桌面单目标诊断

手动运行 Desktop candidate build，默认 linux-x64；支持 win32-x64、darwin-x64、darwin-arm64、all。

```bash
gh workflow run desktop-build.yml --ref main -f target=linux-x64 -f signed=false
# 排查指定平台，或显式使用 target=all
```

单平台与 all 均验证后端、构建原生安装器并上传产物。同一分支同一 target 的新诊断会取消旧诊断。单独诊断产物不能替代统一候选用于正式发行。

## 统一候选

调整版本时运行 `pnpm release:version VERSION`，审查版本变更并合入主线，再启动：

```bash
gh workflow run release-candidate.yml --ref main -f signed=false
gh run list --workflow release-candidate.yml
gh run watch RUN_ID
```

流程为完整 CI → 四端桌面与双架构容器 → 统一组装：

| 目标 | Runner / 产物 |
| --- | --- |
| linux-x64 | ubuntu-22.04；DEB、RPM、AppImage |
| win32-x64 | windows-2022；EXE、MSI |
| darwin-x64 | macos-15-intel；DMG |
| darwin-arm64 | macos-15；DMG |
| Linux 容器 amd64 / arm64 | 两架构分别测试并上传，再合并多架构 digest |

候选关联同一个 source commit、run ID 和 attempt，包含安装器、来源索引、哈希、容器报告、部署清单和待验收模板。统一 artifact 名称为 `candidate-RUN_ID-ATTEMPT`，保留 30 天。下载命令：

```bash
gh run download RUN_ID --name candidate-RUN_ID-ATTEMPT --dir candidate
```

失败后选择 **Re-run all jobs**，不要仅重跑失败 job：汇总会拒绝混合不同 attempt 的产物。产物过期需重新构建并验收。统一候选不因新启动而自动取消当前运行。

## 签名与公证

签名证明发布者身份并检测文件被修改；macOS 公证是 Apple 对签名软件的自动化安全检查。unsigned 内部候选通常可以人工确认后安装，但系统策略可能拦截。正式发布门禁要求 Windows / macOS 签名验证通过。

signed=false 使用 candidate Environment；signed=true 使用 release Environment，配置签名凭据后运行统一候选：

```bash
gh workflow run release-candidate.yml --ref main -f signed=true
```

| 平台 | 当前代码读取的 Secrets |
| --- | --- |
| Windows | WINDOWS_CERTIFICATE（PFX base64）、WINDOWS_CERTIFICATE_PASSWORD |
| macOS | APPLE_CERTIFICATE（P12 base64）、APPLE_CERTIFICATE_PASSWORD、APPLE_SIGNING_IDENTITY、APPLE_API_PRIVATE_KEY、APPLE_API_KEY、APPLE_API_ISSUER |

macOS 使用 Developer ID Application 和公证 API 凭据。准备脚本导入临时 keychain，Tauri 完成签名 / 公证，后续 codesign / spctl 检查，结束清理临时私钥。Windows 当前只实现 PFX 导入与 Authenticode 验证；采购现代硬件 / 云签名证书时需按提供方接口适配，不能默认可导出 PFX。真实 signed=true 全流程仍待验证。

参考：[Apple Developer ID](https://developer.apple.com/developer-id/)、[Tauri macOS 签名](https://v2.tauri.app/distribute/sign/macos/)、[Microsoft 签名方案](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options)。签名不保证新 Windows 文件立即免除 SmartScreen 提示。

在 GitHub 核对 Actions 权限、GHCR 可见范围、candidate / release 环境及审批。环境保护、required reviewers 和分支保护能否使用取决于仓库类型及套餐；不要把文档中的建议当作已启用的远端设置。凭据只存 Secrets，不提交代码或产物。

## 真实验收与发行

下载并核对候选，逐平台完成 GUI、安装卸载、媒体、CSP、升级、退出和数据恢复检查。准备覆盖实际 bundled npm / Rust / native / Node / PocketBase / FFmpeg 的第三方声明和所需源码材料。

将候选 acceptance-template.json 复制到 `docs/release-acceptance/vVERSION.json`（目录不存在时创建），填写 reviewer、UTC 时间、passed 与证据；thirdPartyMaterials 使用受众可访问的 HTTPS 地址和 SHA256。门禁检查声明完整性，不替代人工测试与材料内容审核。pending 或空证据不能通过。

验收记录审查合入 main 后，创建指向已验收 source commit 的版本标签：

```bash
git tag -a vVERSION SOURCE_COMMIT -m 'dBrain VERSION'
git push origin vVERSION
gh workflow run release.yml --ref main -f candidate_run_id=RUN_ID -f tag=vVERSION -f publish=false
```

Publish accepted release 只允许从默认分支运行，要求标签等于候选 source commit、候选来源为当前主线祖先、版本一致、验收通过和镜像 digest 核对成功。它复用产物，不重建。

publish=false 创建草稿；publish=true 在同次运行验证后发布。已有 Release 不覆盖；草稿审查后从 UI 发布，正式资产变更用新版本。私有仓库的已发布 Release 仍需仓库权限，草稿访问范围更窄。不要把“发布”理解为自动公开源码仓库。

应用内自动更新尚未实现；用户手动安装新包。容器升级和回滚见 [运维手册](operations.md)。
