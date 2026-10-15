# 开发手册

## 环境

| 工具 | 要求 |
| --- | --- |
| Node | 按 `.node-version`，当前为 24.15.0 |
| pnpm | 9.0.0，见根 `package.json` |
| Rust | 按 `rust-toolchain.toml`，当前为 1.99.0。桌面开发需要它。 |
| PocketBase | 用仓库下载脚本。脚本获取固定版本和匹配当前平台的二进制。 |
| FFmpeg / FFprobe | 媒体功能和桌面运行时准备需要它们。 |
| Docker Compose | 容器开发、测试和部署需要它。 |

用 `pnpm install --frozen-lockfile` 按锁文件安装。不要把 `node_modules`、构建产物、运行时资源、真实 `.env` 或本地数据库提交到仓库。

## 项目结构

| 目录 | 职责 |
| --- | --- |
| `apps/web` | Next.js Web 应用、登录、注册与工作空间入口 |
| `apps/desktop` | Next.js 静态前端、Tauri 原生程序与运行时打包 |
| `apps/server` | Node 服务入口与桌面本地运行模式 |
| `backend/domain` | 领域模型 |
| `backend/application` | 应用用例 |
| `backend/infrastructure` | 数据库与存储实现 |
| `backend/adapter-front`、`adapter-back`、`adapter-tauri` | 边界适配 |
| `packages` | 共享 UI、编辑器、图谱、数据视图、状态、接口与客户端 |
| `pb` | 开发 PocketBase 与数据。启动脚本指定迁移和 hooks 目录。 |
| `deploy` | Dockerfile、网关配置和部署环境模板 |
| `scripts/release` | 版本、工作流验证、打包校验、候选和发行脚本 |
| `.github/workflows` | CI、桌面、容器、候选与发行工作流 |

先在共享领域层和应用层更改业务行为。再修改平台适配和 UI。不要把平台细节扩散到领域模型。

## Web 与后端开发

```bash
pnpm install --frozen-lockfile
node scripts/release/download-pocketbase.mjs
cp .env.example .env
# 填写管理员邮箱与密码，并按需更改开发端口
pnpm dev
```

只有两个开发命令。`pnpm dev` 在本机启动 PocketBase、Web 和 Server。`pnpm dev:remote` 为远程域名增加网关 `scripts/dev-gateway.mjs`。两个命令都并行启动子进程。任一进程退出会停止整组。端口来自根 `.env`。同名的 shell 变量优先。

| 服务 | 变量 | 默认 | 地址 |
| --- | --- | --- | --- |
| Web | `DBRAIN_WEB_PORT` | 3000 | <http://localhost:3000> |
| Server | `DBRAIN_SERVER_PORT` | 3001 | <http://localhost:3001> |
| PocketBase | `DBRAIN_PB_HTTP` | 127.0.0.1:8090 | <http://127.0.0.1:8090> |
| 网关（仅 `dev:remote`） | `DBRAIN_GATEWAY_PORT` | 8080 | <https://p8080>.<开发域名> |

两个服务占用同一端口时启动直接报错。PocketBase 不会一直等待。

开发数据默认写入仓库目录 `pb/pb_data`，迁移运行目录为 `pb/pb_data/pb_migrations`。PocketBase 启动器先准备该目录，再创建管理员账号，并显式指定数据、迁移和 hooks 目录。当前 shell 目录不会改变它们。设置 `DBRAIN_PB_DATA_DIR` 时，运行目录也会随之移动；修改 PocketBase 地址时，同时验证后端 `PB_URL`。早于 `0000000001_base_schema.js` 基线的数据库会被拒绝。

`.env` 中的 `DBRAIN_ADMIN_EMAIL` 与密码属于运维账号。应用身份使用普通 `users` 集合。同名的 shell 变量优先于文件。管理员配置更改后，运行 `pnpm pb:admin` 同步开发库账号。

用 `pnpm --filter <package> <script>` 单独运行某个包，或用 `pnpm dev` 运行完整服务栈。

## 公网域名远程开发

`pnpm dev:remote` 等于 `pnpm dev` 加网关进程 `scripts/dev-gateway.mjs`。浏览器可以通过域名访问本机开发栈。

网关在一个端口接收全部请求，按路径分流。

| 路径 | 上游 |
| --- | --- |
| `/trpc` | Server，含 WebSocket 升级 |
| `/pb/api/*` | 开发 PocketBase：注册、登录、附件 |
| `/pb/upload/*` | Server：分块上传会话。Server 把分片写入本机磁盘，拼装后存入 PocketBase。 |
| `/pb/*` | 404。不使用生产的文件网关。 |
| 其余路径，含 `/_next/webpack-hmr` | Next |

网关保留浏览器的 Host 头。Server 用 Host 头与浏览器 `Origin` 比较，在 `apps/server/src/origin.ts` 中做同源判断。改写成上游地址会让所有 API 调用返回 403。

网关是必需的，因为客户端只访问同域的 `/trpc` 与 `/pb`。它不连接浏览器本机的 3001 或 8090。见 `packages/api-client/src/backend-urls.ts`。同域入口必须接住这两个路径。

端口全部来自根 `.env`。`DBRAIN_GATEWAY_PORT`（默认 8080）是网关，也是地址 `https://p<DBRAIN_GATEWAY_PORT>.<DBRAIN_DEV_DOMAIN>` 中的端口。`DBRAIN_WEB_PORT`、`DBRAIN_SERVER_PORT`、`DBRAIN_PB_HTTP` 是三个上游。远程形态下 Next 只绑回环。只有网关对外监听（`DBRAIN_GATEWAY_HOST`，默认 0.0.0.0）。`DBRAIN_DEV_DOMAIN` 只在启动时打印地址。它不参与监听。

命令自己注入上游地址（`DBRAIN_WEB_URL`、`DBRAIN_SERVER_URL`、`DBRAIN_PB_URL`）。不要手工设置它们。`DBRAIN_GATEWAY_LOG=1` 打印每个请求。默认只打印 `/trpc`、`/pb` 和升级请求。

## 桌面开发

桌面前端复用 Web 应用。Tauri 启动 Node 后端和 PocketBase。桌面应用不需要开发 Web 服务栈。它不读取根 `.env` 中的运维账号。

原生构建需要对应 OS 和架构的运行时。

| 平台 | 额外依赖 |
| --- | --- |
| Linux | WebKitGTK 4.1、GTK 3、OpenSSL、librsvg 和 C/C++ 工具链。AppImage 还需要 patchelf、GStreamer 工具和 base、good、libav 插件。 |
| Windows | Rust MSVC、Visual Studio C++ Build Tools、Windows SDK、WebView2 |
| macOS | Xcode Command Line Tools，以及匹配架构的运行时和媒体依赖 |

Ubuntu 可以使用工作流中的依赖列表。

```bash
sudo apt-get update
sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev libssl-dev librsvg2-dev build-essential patchelf ffmpeg gstreamer1.0-tools gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-libav
```

PocketBase 默认使用 `pb/pocketbase`（Windows 为 `.exe`）。应用从 PATH 查找 FFmpeg 和 FFprobe。可以设置 `DBRAIN_POCKETBASE_PATH`、`FFMPEG_PATH`、`FFPROBE_PATH`。

```bash
pnpm dev:desktop
# 或在当前目标平台生成安装包
pnpm build:desktop
```

Tauri 的 `beforeDevCommand` 和 `beforeBuildCommand` 先准备运行时，再启动或构建前端。`pnpm --filter desktop build` 只生成静态前端。它不能代替原生应用验证。生成资源位于 `apps/desktop/src-tauri/runtime`。安装包通常在 `apps/desktop/src-tauri/target/release/bundle`。

当前发行目标是 Linux x64、Windows x64 和 macOS x64 / arm64。没有 Linux 或 Windows ARM 桌面目标，也不生成 macOS universal 包。Linux 各发行版的兼容性要在实际目标系统上测试。

## 提交前检查

人在终端运行 `pnpm gate`，按提示填写。自动化可用 `pnpm gate --until=plan` 查看改动路径选出的检查。后续阶段会在提交前运行这些检查。下面的命令用于定位某项检查的问题，或准备全量发布检查。

```bash
pnpm release:check
pnpm check-types
pnpm lint:gate
pnpm test:release
pnpm build
```

按改动范围补充桌面后端验证。

```bash
pnpm --filter desktop runtime:prepare
node apps/desktop/scripts/backend-smoke.mjs
cargo test --locked --release --lib --manifest-path apps/desktop/src-tauri/Cargo.toml
```

Cargo 验证前准备 Tauri 配置要求的运行时和前端资源。Server smoke 需要隔离测试库。不要把它指向生产服务。

`pnpm lint:gate` 与已有基线比较。它阻止新增诊断。这不代表仓库零警告。修复旧诊断后，用 `node scripts/release/lint-gate.mjs --update-baseline` 缩减基线。扩大基线要在代码审查中说明原因。

## 选择 CI/CD 操作

从仓库根目录运行这些命令。[CI/CD 流水线](ci-cd.md)说明门控和发布证据。

| 意图 | 操作 |
| --- | --- |
| 预览本次改动的检查 | `pnpm gate --until=plan` |
| 定位某项检查的问题 | 运行对应命令，例如 `pnpm check-types`、`pnpm lint:gate`、`pnpm test:release` 或 `pnpm build`。 |
| 只运行检查，不提交 | `pnpm gate --until=check` |
| 检查并提交，但暂不推送 | `pnpm gate --until=commit -m "type(scope): subject"` |
| 检查、提交并推送 | `pnpm gate --until=push -m "type(scope): subject"` |
| 创建 PR，但不请求自动合并 | `pnpm gate --until=pr -m "type(scope): subject"` |
| 创建 PR 后请求自动合并 | `pnpm gate --until=merge -m "type(scope): subject"` |
| 运行全部本地检查 | 在所选阶段添加 `--full`。 |
| 修改门控脚本或工作流 | 用 `--until=pr` 或 `--until=merge`。PR 还需要 `gate-change` 标签和人工复核。 |
| 开发功能或修复 | 从 `develop` 创建分支，然后运行 `pnpm gate --until=merge -m "type(scope): subject"`。PR 进入 `develop`。 |
| 紧急修复生产问题 | 从 `main` 创建 `hotfix/NAME` 分支，然后运行 `pnpm gate --until=merge -m "fix(scope): subject" --version=VERSION`。Gate 同步版本，并同时创建面向 `main` 和 `develop` 的 PR。 |
| 准备新版本和平台 | 从 `develop` 创建 `release/VERSION` 分支。运行 `pnpm gate --until=merge -m "chore(release): prepare VERSION" --version=VERSION --desktop-targets=linux-x64,win32-x64 --container-platforms=linux/amd64,linux/arm64`。PR 进入 `develop`。 |
| 将 develop 晋升到 main | 在干净且已更新的 `develop` 上运行 `pnpm gate --until=merge -m "chore(release): promote VERSION" --desktop-targets=linux-x64,win32-x64 --container-platforms=linux/amd64,linux/arm64`。列表必须与 `release.json` 一致。main 的 CI 打标签并构建候选。 |
| 重跑现有标签的可发布候选构建 | 手动启动 `gate.yml` 并设置 `release=true`。发布需要这次 Gate 的 run ID。 |
| 诊断候选的部分平台 | 手动启动 `release-candidate.yml`，用 `desktop_targets` 或 `container_platforms` 选择已声明平台的子集。这次独立运行不能传给 `release.yml`。 |
| 创建发布草稿 | 从 `main` 手动启动 `release.yml`，提供候选 Gate run ID、标签和 `publish=false`。 |
| 直接发布已验证版本 | 用相同输入手动启动 `release.yml`，并设置 `publish=true`。 |
| 查看或应用仓库门控策略 | 用 `pnpm gate:policy` 查看；管理员用 `pnpm gate:policy --apply` 应用。 |

`pnpm gate` 会提交工作区中的全部改动。运行前先提交或暂存无关工作。

## 日常维护

从 `develop` 创建短期开发分支。Gate 将其路由回 `develop`。热修复分支从 `main` 创建，并有两个 PR。晋升会检查计划中的合并结果。只有 `main` 有 `develop` 缺少的内容，或合并发生冲突时，才需要同步 PR。非草稿 PR 运行 Gate 验证器。推送到任一受保护分支后运行合并验证。每次推送到 main 还会启动候选构建。

新增 JavaScript 依赖时，更新对应 workspace 包和 `pnpm-lock.yaml`。新增 Rust 依赖时，更新 `Cargo.lock`。不要修改已发行迁移。新增 migration 并验证旧数据升级、权限和附件归属。修改 Node、PocketBase、FFmpeg、Tauri 或原生依赖后，重新验证受影响平台。验证运行时、安装包和备份恢复。

在 `release/*` 分支用 `pnpm gate` 选择版本和平台；需要诊断版本文件时再运行 `pnpm release:check`。构建和发布入口见 [CI/CD 流水线](ci-cd.md)。远端 CI 保存 Next.js、Rust 依赖和 Docker 层缓存。缓存只保存中间数据，不跳过验证。冷构建或被淘汰的缓存仍执行每一步。命中和维护方法见该手册的缓存章节。
