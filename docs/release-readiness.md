# dBrain 发布前置问题修复与验收报告

日期：2026-10-10（UTC）。范围：当前工作区修复、已完成的验证和未闭合的发布门槛。

**结论：本轮已收尾，但软件尚不能认定为满足全部正式发布条件。** 容器/桌面打包配置、核心数据访问、运行时管理和开发检查已完成一轮修复；编辑器 lint、完整容器启动、最新桌面安装包与 Windows/macOS 验收仍未闭合。验收收尾时尚未提交代码；随后按用户要求将本轮改动提交到本地 Git。没有推送代码、创建 Release 或部署正式服务。

## 1. 已修复

| 问题 | 本轮处理 |
| --- | --- |
| server 的 build 只检查类型，没有 Dockerfile 所需的 dist | 增加独立 ESM 打包，将外部 PDF/canvas 及本平台原生绑定复制到产物。独立产物已在仓库外启动验证。 |
| Dockerfile 缺少 workspace 上下文、产物路径错误 | 重写两个 Dockerfile；使用固定 Node/pnpm，复制 monorepo 上下文，修正 Next standalone/public/static 路径；服务以非 root 运行并增加健康检查。 |
| PocketBase 镜像浮动且不包含项目 migrations | 自建 PocketBase 镜像，固定 0.40.4，按 amd64/arm64 下载并校验官方发布资产 SHA256，携带 migrations/hooks。 |
| 浏览器无法访问容器内部服务名；附件 URL 不适合部署迁移 | 生产前端采用同源 `/trpc`、`/pb`，增加 Nginx 入口；后端提供受控文件网关、cookie 身份校验、Range 和 HLS 前缀重写。新文件地址保存为可迁移的相对路径。 |
| 数据表允许匿名读写、工作空间之间缺乏隔离 | 增加增量权限迁移，区分 owner/editor/viewer，限制数据及成员管理；共享附件和衍生 PDF/HLS 文件保持工作空间范围。旧初始 migration 未修改。 |
| 并发身份可能写入共享 SDK 状态 | 后端使用 AsyncLocalStorage 隔离请求令牌；登录使用独立 SDK 实例；受保护操作再次验证令牌。 |
| 私有事件向其他用户广播 | 事件带工作空间范围，订阅按当前成员权限过滤；移除成员后停止转发其无权访问的事件。 |
| 文本外键允许跨工作空间连接 | 增加 PocketBase edge 请求校验；工作空间删除先检查所有者，并在删除父对象前清理成员。 |
| 全仓检查被依赖环和不完整 TS aliases 阻断 | 根命令改为 pnpm 调度；统一 workspace TypeScript 路径和 `.ts` 导入设置；补 backend 可用的根 ESLint 配置。没有大规模重构现有依赖环。 |
| 桌面升级缺少数据库备份 | 在持有设备锁、启动迁移前，用 SQLite backup API 创建数据库快照并复制附件及身份；备份失败则停止迁移。成功后记录版本状态。 |
| 桌面运行时来源/架构缺少核对 | 检查 ELF/PE/Mach-O 架构、PocketBase 固定版本、FFmpeg 编码器；生成运行时版本、模块版本、SHA256 和数据库升级 fingerprint。 |
| macOS 动态库与内置运行时签名缺少处理 | 增加 dylib 收集与相对路径修复、Node JIT entitlements、运行时签名及 CI 证书准备/清理。Windows 增加运行时签名入口。代码已编写，尚未在对应平台验收。 |
| 桌面 CSP 被关闭 | 配置静态资源、原生 IPC、回环后端、媒体及 worker 所需的 CSP。**新增 CSP 尚未通过最新原生窗口验收。** |
| 产品版本不一致、没有发行元数据 | 增加版本同步和一致性检查、固定工具链、候选安装包收集和 SHA256 清单。按用户决定设置闭源、保留全部权利的许可证。 |
| 缺少自动化检查与跨平台候选构建 | 增加 CI、四目标桌面候选构建和依赖更新配置。可选择准备签名凭据；候选报告明确标记 `distributionReady: false`，不会自动公开发布。GitHub 上尚未执行这些工作流。 |

主要入口：

- `pnpm release:check`：检查版本、工具链及关键发布配置一致性。
- `pnpm release:version 0.2.0`：同步产品版本、Cargo.lock、Compose 默认值和部署模板。
- `pnpm check-types` / `pnpm lint` / `pnpm test:release`：开发检查。
- `pnpm --filter server build` / `pnpm smoke:server`：独立后端构建与完整集成验证。
- `node scripts/release/download-pocketbase.mjs`：下载本平台固定版本 PocketBase。
- `pnpm --filter desktop runtime:prepare` / `node apps/desktop/scripts/backend-smoke.mjs`：桌面后端准备与仓库外验证。

## 2. 实际完成的验证

| 检查 | 结果与范围 |
| --- | --- |
| 锁文件安装 | 远程 frozen 安装成功；本地 frozen/offline 安装成功。 |
| workspace 类型检查 | **20 个具有 typecheck 脚本的包通过，0 个 TS 错误。** 证据：`docs/release-validation/typecheck.txt`。 |
| 发布回归测试 | **7 项通过。** 覆盖会话/Origin、文件路径、HLS 前缀、WAL 数据库备份、并发身份、版本/标签一致性。证据：`docs/release-validation/unit-tests.txt`。 |
| 独立 server 打包及运行 | 在授权构建机 `yuqi` 的 `/tmp/dbrain-release-check` 构建；将 dist 复制到仓库外、使用临时数据库运行成功。 |
| 两用户安全集成测试 | 新数据库 migrations、注册/并发登录、匿名拒绝、跨用户读写拒绝、文件所有权、cookie 下载、Range、Origin 与管理路径拒绝通过。 |
| 服务端媒体与共享权限 | PDF/native canvas、FFmpeg 转码、同源 HLS、共享附件和衍生文件、viewer 写入拒绝、成员移除后的文件/事件权限撤销通过。 |
| 桌面打包后端 | Linux x64 运行时准备及完整后端 smoke 通过：十种节点、关系、事件、Dashboard 冲突、附件/PDF/视频/HLS、退出清理和重启持久化。该检查验证后端，**不代表最新原生窗口或安装包通过。** |
| JS 发布脚本语法、源码差异 | `node --check`、版本一致性检查和 `git diff --check` 通过。 |
| 全仓 lint | **19 个包通过，editor 失败：67 errors / 39 warnings。** 没有通过关闭规则掩盖问题。摘要：`docs/release-validation/lint-summary.txt`。 |
| Docker 构建 | 专用测试项目中 PocketBase/server 镜像构建完成；Web build 未完成。按用户要求尽快收尾，停止本轮长构建并清理专用测试容器/卷。**完整 Compose 启动未验收。** |

成功的远程服务集成输出已记录为 `docs/release-validation/server-smoke.txt`；桌面后端输出摘要记录为 `docs/release-validation/desktop-backend-smoke.txt`。测试数据库为临时数据，由测试脚本清理，未修改用户实际数据库。

## 3. 尚未闭合的发布门槛

1. **编辑器 lint。** 存量问题包括 `any`/`Function` 类型、React effect/ref 规则等；本轮没有扩展到大规模编辑器改写。当前 CI 的 lint 步骤会失败，应修复后再要求 CI 全绿。
2. **完整容器。** 必须使用最终源码重建 Web 镜像，并实际执行 CI 中的 Compose、生产页面、网关和媒体测试。本轮部分镜像来自更早源码快照，不能替代最终版本验收。Web 的 Google 字体构建下载仍存在外部网络依赖，尚未确认此轮构建结果。
3. **最新 Linux 原生安装包。** 新 CSP、runtime 资源和权限迁移需重新构建 DEB/RPM/AppImage，完成原生窗口、实际安装/卸载、音视频播放和版本升级验收；不能沿用此前 `.scratch` 旧包的验证结论。
4. **Windows/macOS。** 候选 workflow、动态库和签名代码尚未执行。需要对应 runner、有效 Windows 签名凭据、Apple Developer ID 和公证凭据；必须验证安装、媒体播放、进程退出及升级。Windows/Linux ARM64 当前不在首版桌面矩阵内。
5. **发行用第三方材料。** 运行时版本/哈希清单已经生成，但尚未完成全部 npm/Rust/Node/PocketBase/FFmpeg 及附带库的许可文本与对应源码材料打包。当前 macOS/Linux FFmpeg 供应还会随包管理器补丁变化；其来源与发布材料需要固定并验收。闭源 LICENSE 不替代这些组件的许可证。
6. **已有多用户数据库的历史附件。** 初始匿名附件没有 owner；迁移只在单用户数据库中自动分配所有者。多用户库的未归属附件会被拒绝访问，需要发布前审核归属并制定迁移方案，不能猜测所有者或重新公开全部文件。历史无 workspaceId 数据同样需检查。
7. **GitHub 启用与正式发布。** 工作流还没有推送/运行；环境保护、签名 Secrets、正式发布说明、安装验收记录和发布批准仍需落实。应用内自动更新插件及 stable/beta 更新渠道本轮未实现。

## 4. 建议下一步顺序

修复 editor lint → 最终源码容器验收 → Linux 最新安装包及 CSP 验收 → Windows/macOS 候选构建与签名、公证验收 → 补齐第三方发行材料及历史数据迁移 → 生成同一 commit 的候选产物 → 批准正式发布。

为保持本轮边界清楚，未把未执行的签名流程、CSP 或平台构建标为“已验证”；也未进行推送、生产部署或公开发行。

## 5. 参考

- [Tauri GitHub 构建流水线](https://tauri.app/distribute/pipelines/github/)
- [Tauri Windows 签名](https://tauri.app/distribute/sign/windows/)、[macOS 签名与公证](https://v2.tauri.app/distribute/sign/macos/)
- [PocketBase API rules 与别名](https://pocketbase.io/docs/api-rules-and-filters/)、[JavaScript 事件 hooks](https://pocketbase.io/docs/js-event-hooks/)
- [Docker 多架构构建](https://docs.docker.com/build/ci/github-actions/multi-platform/)
