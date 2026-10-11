# dBrain 发布前置问题修复与验收报告

日期：2026-10-11（UTC）。范围：当前工作区修复、已完成的验证和未闭合的发布门槛。

**结论：全仓 lint 与完整容器验收的既有门槛已闭合；本次续建已补齐开发维护、统一候选构建、来源/校验核验及验收驱动发布流程。Linux 原生程序和 DEB/RPM/AppImage 已生成，实际 DEB/AppImage 的完整离线后端验收通过。软件仍未满足全部正式发布条件**：原生 GUI/CSP 与安装升级验收、Windows/macOS 与签名公证、第三方发行材料、历史数据迁移、真实 GitHub 候选与发行验收仍未完成。

上一阶段改动已提交到本地 Git：`47307af`（lint）、`dc8a78c`（web 预渲染）、`ad25111`（web 镜像 public）、`ad9368e`（容器端口发布）。没有推送代码、创建 Release 或部署正式服务。

## GitHub 实际执行（2026-10-11）

用户配置 GitHub CLI 认证后，已核验私有仓库 `Yuqi-666/dBrain`；默认分支为 `main`，当前工作分支为 `develop`。`2d2eb1b` 已由用户推送。首次真实 [CI run 38110711790](https://github.com/Yuqi-666/dBrain/actions/runs/38110711790) 的容器启动、生产 Web、数据权限及媒体鉴权检查通过，但媒体样本生成报 `spawnSync ffmpeg ENOENT`：测试客户端在 runner 生成样本，容器内的 FFmpeg 不能满足该依赖。`4dd0ff6` 在 CI containers 与原生容器候选任务显式安装 runner FFmpeg，并已提交/推送重验。

统一候选手动启动实际返回 404，因 `release-candidate.yml` 尚未存在于默认分支。`develop` 比 `main` 领先 217 个提交，已创建 [草稿 PR #1](https://github.com/Yuqi-666/dBrain/pull/1) 供审查整合范围；用户随后要求取消 PR 并进行最后手动检查，PR #1 已关闭且未合并；保留验证报告，没有更改默认分支，统一候选执行暂缓。Actions 已开启，默认 token 权限为 read；工作流按 job 显式申请所需权限。当前没有已配置的 environment 或仓库 Secret 名称返回，签名和环境保护仍待配置。以下旧阶段的“未推送/未运行”描述仅反映各阶段当时状态；本节为最新远端状态。

修复后的 [develop CI run 38111650383](https://github.com/Yuqi-666/dBrain/actions/runs/38111650383) 已完成，`check` 与 `containers` 均为 **success**；工作流静态检查、20 包类型/lint 增量门禁、13 项回归、独立 server 和桌面后端 smoke、Web 生产构建及完整容器 smoke 在真实 GitHub runner 通过。证据：`docs/release-validation/github-ci.txt`。[PR CI run 38111690205](https://github.com/Yuqi-666/dBrain/actions/runs/38111690205) 也已完成，两个 job 均 success，验证与 main 的合并结果可构建。PR 已按用户要求关闭，未合并。这不代表四平台候选或正式发布验收通过。

## 工作流续建（2026-10-11，基于 `8c93272`）

已审查 `47307af` 至 `8c93272` 的 lint、Web 构建及容器端口修复与更新后的证据；保留已闭合的两项验收结论。本轮继续完成开发维护和发行链路，当前改动尚未提交/推送。

- 增加 `release-candidate.yml`，复用 CI，并编排四平台桌面和两架构原生容器构建。每架构容器通过完整 smoke 后上传同一批镜像，发行清单使用不可变 digest。
- 增加 `release.yml`：只接受本仓库成功的统一候选 run；核对产品版本、已存在标签、source commit、run/attempt、产物 hash 和逐平台验收记录；默认创建草稿，可明确选择正式发布。不会重建已验收二进制或覆盖现有 Release。
- 候选汇总保留安装器、运行时清单、签名验证结果、部署配置、全文件校验和和待填写验收模板。未签名 Windows/macOS、未完成验收、缺失目标和被修改的产物被拒绝。
- 修复 macOS 验证脚本的非可移植 find 用法，增加 Windows 安装器 Authenticode/证书指纹检查；签名临时目录在准备开始时登记，失败也能进入清理。
- CI 使用 `lint:gate`：20 包逐文件/规则/消息的增量门禁，保留 **89 条显式存量诊断**，新增或增长即失败。并非关闭 only-warn 后的严格零错误验收。另修正条件调用 `useGraph` 的真实 Hook 顺序问题和把普通 `use` 回调误判为 Hook 的命名问题。
- 修复开发 PocketBase 启动器：跨平台选可执行文件，使用固定 `pb/pb_data` 与仓库 migrations/hooks；去除 `dev:full` 中 Windows 不支持的 shell 环境赋值，更新 README 与完整操作手册。

本轮已验证：**20 个 workspace 类型检查通过；13 项发布回归测试通过；5 个工作流通过官方 SHA256 校验的 actionlint 1.7.12；lint 增量门禁通过；开发启动器在临时数据库验证 migrations、匿名拒绝及退出清理通过。** 门禁测试覆盖未签名、未验收、混入不同 commit/attempt、产物篡改、缺失平台、失败/外部仓库/错误类型 run。

Linux 最新构建源码的运行时准备、桌面静态生产构建、原生 Rust 编译通过；DEB/RPM/AppImage 三格式已生成，最终收集器和 SHA256SUMS 检查全部通过。实际 DEB 的准备资源哈希一致；实际 AppImage 允许 linuxdeploy 原生 ELF 路径修补，并核对 JS/migrations/静态 PocketBase 未改变，两者的完整后端 smoke 均通过。Rust 原生监督器回归 **1 项通过**。首次 AppImage 全量打包失败（linuxdeploy），单独详细重打包成功；首次失败的精确根因未复现，本轮没有把它写成已修复的确定缺陷，CI 已开启 Linux 详细日志。未验证图形窗口及实际安装/卸载/升级。

Linux 验收使用 `/tmp/dbrain-release-check` 和 `DBRAIN_GIT_SHA=local-workflow-review`，为工作区源码验证，**不是可正式推广的 GitHub 候选**。产物保留在构建机 `release-artifacts/linux-x64`，没有上传公共发行渠道。准备阶段 runtime-manifest 的原生哈希可能被打包/签名改变；最终安装包以外层 SHA256SUMS 为准，收集报告明确记录 hash scope。证据：`docs/release-validation/linux-packages-smoke.txt`、`linux-rust-tests.txt`；本地门禁证据为 `workflow-typecheck.txt`、`workflow-lint-gate.txt`、`workflow-unit-tests.txt`、`workflow-checks.txt`。Windows/macOS、GHCR 上传与多架构合并、GitHub Release 创建、公证和原生 GUI **尚未实际执行验收**。第三方材料仍需实际生成和审查；验收记录只声明材料 URL/hash，不替代材料内容核验。真实验收 JSON 尚不存在，因此现状仍会被正式发布门禁拒绝。

操作步骤和首次仓库配置见 [开发维护与发布手册](release-workflow.md)。本轮没有设置远端 Secrets/审批，也没有创建 Release 或部署正式服务。

## 1. 本轮（2026-10-11）修复

| 问题                                                                    | 本轮处理                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@workspace/editor` 是全仓唯一 lint 失败的包（67 errors / 39 warnings） | 该包是唯一仍使用 `eslint-config-next`（未声明该依赖，经根 `node_modules` 提升解析）的包，因此也是唯一启用 `eslint-plugin-react-hooks` 7 编译器规则集（`refs`/`set-state-in-effect`/`immutability` 共 42 errors）与 Next 专用规则（`no-img-element` 4 warnings）的包。它本身是 React 组件库（无 app router、无 next.config、无 next 依赖），改用与其他 10 个同族包一致的 `@workspace/eslint-config/react-internal` 并显式声明该依赖；随后修复 58 条真实告警（32 未使用参数/导入/局部变量、19 `no-explicit-any`、6 `no-unsafe-function-type`、1 失效的 disable 指令）。唯一例外是在包内配置里注明原因的 `react/prop-types: off`：137 条命中全部是 `React.FC<Props>`/`forwardRef` 组件的误报，属性由 `tsc` 保证。 |
| CI 的 `pnpm --filter web build` 在预渲染 `/login` 时失败                | Next 16 拒绝预渲染直接调用 `useSearchParams()` 的路由（`should be wrapped in a suspense boundary`）。把登录表单拆到 `LoginForm` 并用 `<Suspense>` 包裹（fallback 保留卡片宽度）。本地与容器内构建均已在 8/8 静态页通过。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| web 镜像构建最后一步失败：`COPY /app/apps/web/public` 不存在            | `apps/web` 没有 `public` 目录，而 Next standalone 产物不会自动携带静态目录。按仓库既有 `.gitkeep` 约定补齐 `apps/web/public/.gitkeep`：镜像可构建，且以后新增静态资源会被自动带入（否则会静默 404）。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| CI 容器栈从未真正发布 PocketBase 端口                                   | Docker 对仅连接 `internal: true` 网络的容器会静默丢弃端口映射（docker 29.1.3 实测：internal-only 时 `NetworkSettings.Ports` 为 `{"8090/tcp":null}`，接入任一非 internal 网络后才绑定）。生产 `backend` 网络是 internal，故 `deploy/compose.test.yml` 里 13090 的映射从未生效，CI 的 `containers` 任务会在 `ready(${pbUrl}/api/health)` 超时失败。测试覆盖层为 pocketbase 增加仅用于探测的 bridge 网络 `probe`（web/gateway 不加入），生产拓扑与隔离性不变。                                                                                                                                                                                                                                                    |
| 其他清理                                                                | `apps/web` 3 条告警（未使用导入/局部变量、`next.config.mjs` 的 Node 全局）；`turbo.json` 声明 editor 读取的 6 个 `NEXT_PUBLIC_TIPTAP_*` 变量；移除误入 pnpm 工作区的 npm `packages/editor/package-lock.json` 与遗留 `eslint.config.mjs`。                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

修复 1 的关键事实：这三个 web/容器缺陷此前从未被发现，因为 GitHub 上的工作流尚未执行；按原状，CI 的 `check` 任务（web build）与 `containers` 任务都不可能通过。

## 2. 上一轮（2026-10-10）已修复

| 问题                                                    | 处理                                                                                                                                               |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| server 的 build 只检查类型，没有 Dockerfile 所需的 dist | 增加独立 ESM 打包，将外部 PDF/canvas 及本平台原生绑定复制到产物。独立产物已在仓库外启动验证。                                                      |
| Dockerfile 缺少 workspace 上下文、产物路径错误          | 重写两个 Dockerfile；使用固定 Node/pnpm，复制 monorepo 上下文，修正 Next standalone/public/static 路径；服务以非 root 运行并增加健康检查。         |
| PocketBase 镜像浮动且不包含项目 migrations              | 自建 PocketBase 镜像，固定 0.40.4，按 amd64/arm64 下载并校验官方发布资产 SHA256，携带 migrations/hooks。                                           |
| 浏览器无法访问容器内部服务名；附件 URL 不适合部署迁移   | 生产前端采用同源 `/trpc`、`/pb`，增加 Nginx 入口；后端提供受控文件网关、cookie 身份校验、Range 和 HLS 前缀重写。新文件地址保存为可迁移的相对路径。 |
| 数据表允许匿名读写、工作空间之间缺乏隔离                | 增加增量权限迁移，区分 owner/editor/viewer，限制数据及成员管理；共享附件和衍生 PDF/HLS 文件保持工作空间范围。旧初始 migration 未修改。             |
| 并发身份可能写入共享 SDK 状态                           | 后端使用 AsyncLocalStorage 隔离请求令牌；登录使用独立 SDK 实例；受保护操作再次验证令牌。                                                           |
| 私有事件向其他用户广播                                  | 事件带工作空间范围，订阅按当前成员权限过滤；移除成员后停止转发其无权访问的事件。                                                                   |
| 文本外键允许跨工作空间连接                              | 增加 PocketBase edge 请求校验；工作空间删除先检查所有者，并在删除父对象前清理成员。                                                                |
| 全仓检查被依赖环和不完整 TS aliases 阻断                | 根命令改为 pnpm 调度；统一 workspace TypeScript 路径和 `.ts` 导入设置；补 backend 可用的根 ESLint 配置。没有大规模重构现有依赖环。                 |
| 桌面升级缺少数据库备份                                  | 在持有设备锁、启动迁移前，用 SQLite backup API 创建数据库快照并复制附件及身份；备份失败则停止迁移。成功后记录版本状态。                            |
| 桌面运行时来源/架构缺少核对                             | 检查 ELF/PE/Mach-O 架构、PocketBase 固定版本、FFmpeg 编码器；生成运行时版本、模块版本、SHA256 和数据库升级 fingerprint。                           |
| macOS 动态库与内置运行时签名缺少处理                    | 增加 dylib 收集与相对路径修复、Node JIT entitlements、运行时签名及 CI 证书准备/清理。Windows 增加运行时签名入口。代码已编写，尚未在对应平台验收。  |
| 桌面 CSP 被关闭                                         | 配置静态资源、原生 IPC、回环后端、媒体及 worker 所需的 CSP。**新增 CSP 尚未通过最新原生窗口验收。**                                                |
| 产品版本不一致、没有发行元数据                          | 增加版本同步和一致性检查、固定工具链、候选安装包收集和 SHA256 清单。按用户决定设置闭源、保留全部权利的许可证。                                     |
| 缺少自动化检查与跨平台候选构建                          | 增加 CI、四目标桌面候选构建和依赖更新配置。可选择准备签名凭据；候选报告明确标记 `distributionReady: false`，不会自动公开发布。                     |

## 3. 实际完成的验证

| 检查                             | 结果与范围                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 锁文件安装                       | 本轮在同一工作区执行 `pnpm install --frozen-lockfile` 成功（新增 editor 依赖后锁文件已同步）。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| workspace 类型检查               | **20 个具有 typecheck 脚本的包通过，0 个 TS 错误。** 证据：`docs/release-validation/typecheck.txt`。另单独验证：删除 `apps/web/.next` 后 `apps/web` 仍可 typecheck（CI 冷检出场景）。                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 全仓 lint                        | **20 passes / 0 fails（exit 0）**，editor 由 106 problems 降为 0。仍有 89 条历史 warning 分布在 10 个包（backend/application 23、packages/ui 25、backend/domain 8、backend/infrastructure 8、apps/server 6、api-client 5、store 5、interfaces 4、graph 3、hooks 2），本轮未扩展处理。证据与说明：`docs/release-validation/lint-summary.txt`。                                                                                                                                                                                                                                                                     |
| 发布回归测试                     | **7 项通过。** 覆盖会话/Origin、文件路径、HLS 前缀、WAL 数据库备份、并发身份、版本/标签一致性。证据：`docs/release-validation/unit-tests.txt`。                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 发布配置一致性                   | `pnpm release:check` 通过：`Release source checks passed: 0.1.0`。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Web 生产构建                     | 本地 `pnpm --filter web build` 与 web 镜像内构建均通过：8/8 静态页生成，`/`、`/login`、`/register`、`/graph`、`/dashboard` 均为 `○ (Static)`，`/login` 的 Suspense 修复生效。证据：`docs/release-validation/web-build.txt`。                                                                                                                                                                                                                                                                                                                                                                                      |
| 完整容器栈（最终源码）           | 在构建机 `yuqi` 上对 commit `ad9368e` 执行 CI 的 containers 任务命令：`docker compose up --build --wait --wait-timeout 180` 退出码 0，gateway / pocketbase / server / web 四个容器全部 healthy 且端口映射正确（13080/13090/13081）。随后执行 `server-smoke.mjs`（DBRAIN*SMOKE*\* 指向容器栈）**退出码 0，6 组断言全部 PASS**：生产 Web 与反向代理、全新 migrations 与匿名拒绝、文件归属与 cookie 鉴权媒体（Range、管理路径与 Origin 拒绝）、PDF/native canvas 与 FFmpeg 同源 HLS、跨用户节点与事件隔离（含 viewer 权限与成员移除）、并发登录隔离与授权删除。证据：`docs/release-validation/container-smoke.txt`。 |
| 独立 server 打包及运行（上一轮） | 在 `yuqi` 的 `/tmp/dbrain-release-check` 构建；将 dist 复制到仓库外、使用临时数据库运行成功。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 桌面打包后端（上一轮）           | Linux x64 运行时准备及完整后端 smoke 通过：十种节点、关系、事件、Dashboard 冲突、附件/PDF/视频/HLS、退出清理和重启持久化。该检查验证后端，**不代表最新原生窗口或安装包通过**。                                                                                                                                                                                                                                                                                                                                                                                                                                    |

本轮验收后已用 `docker compose -p dbrain-ci ... down -v` 清理测试容器、网络与数据卷；原始日志保留在构建机 `/tmp/dbrain-container-up.log`、`/tmp/dbrain-container-smoke.log`。测试数据库为临时数据，未触碰用户实际数据库。

## 4. 尚未闭合的发布门槛

1. **Linux 原生窗口与安装验收。** 本次已重新生成 DEB/RPM/AppImage，并验证实际 DEB/AppImage 的离线后端；新 CSP 仍需原生窗口、实际安装/卸载、音视频播放和版本升级验收。RPM 本轮只验证生成与校验和，未运行其安装后环境；不能沿用此前 `.scratch` 旧包的 GUI 结论。
2. **Windows/macOS。** 候选 workflow、动态库和签名代码尚未在对应平台执行。需要对应 runner、有效 Windows 签名凭据、Apple Developer ID 和公证凭据；必须验证安装、媒体播放、进程退出及升级。Windows/Linux ARM64 当前不在首版桌面矩阵内。
3. **发行用第三方材料。** 运行时版本/哈希清单已经生成，但尚未完成全部 npm/Rust/Node/PocketBase/FFmpeg 及附带库的许可文本与对应源码材料打包。当前 macOS/Linux FFmpeg 供应还会随包管理器补丁变化；其来源与发布材料需要固定并验收。闭源 LICENSE 不替代这些组件的许可证。
4. **已有多用户数据库的历史附件。** 初始匿名附件没有 owner；迁移只在单用户数据库中自动分配所有者。多用户库的未归属附件会被拒绝访问，需要发布前审核归属并制定迁移方案，不能猜测所有者或重新公开全部文件。历史无 workspaceId 数据同样需检查。
5. **GitHub 启用与正式发布。** 工作流还没有推送/运行；环境保护、签名 Secrets、正式发布说明、安装验收记录和发布批准仍需落实。应用内自动更新插件及 stable/beta 更新渠道本轮未实现。
6. **门禁强度与遗留告警（新增记录）。** `@workspace/eslint-config` 中的 `eslint-plugin-only-warn` 会把规则降级为 warning，原始 `pnpm lint` 仍不能代表严格零错误。本次续建已让 CI 使用新增 `lint:gate` 阻止新增/增长的诊断，存量仍需逐步清理。此外全仓仍有 89 条历史 warning，`apps/web` 使用 Next 16 已弃用的 `middleware` 约定（应改为 `proxy`），生成的 `next-env.d.ts` 会在 dev/build 之间来回抖动造成 diff 噪音。这些不影响本次门禁结论，但应在发布前决定是否收紧。

## 5. 建议下一步顺序

真实 GitHub 统一候选执行 → Linux CSP/安装/升级原生验收 → Windows/macOS 候选构建与签名、公证验收 → 补齐第三方发行材料及历史数据迁移 → 生成同一 commit 的候选产物 → 批准正式发布。

为保持边界清楚，未执行的签名流程、CSP 或平台构建均未被标为“已验证”；也未进行推送、生产部署或公开发行。

## 6. 参考

- [Tauri GitHub 构建流水线](https://tauri.app/distribute/pipelines/github/)
- [Tauri Windows 签名](https://tauri.app/distribute/sign/windows/)、[macOS 签名与公证](https://v2.tauri.app/distribute/sign/macos/)
- [PocketBase API rules 与别名](https://pocketbase.io/docs/api-rules-and-filters/)、[JavaScript 事件 hooks](https://pocketbase.io/docs/js-event-hooks/)
- [Docker 多架构构建](https://docs.docker.com/build/ci/github-actions/multi-platform/)
- [Next.js：useSearchParams 需要 Suspense 边界](https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout)
- [Compose networks 的 internal 选项](https://docs.docker.com/reference/compose-file/networks/#internal)
