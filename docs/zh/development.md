# 开发手册

## 环境

| 工具 | 要求 |
| --- | --- |
| Node | 按 `.node-version`，当前为 24.15.0 |
| pnpm | 9.0.0，见根 `package.json` |
| Rust | 按 `rust-toolchain.toml`，当前为 1.99.0。桌面开发需要它。 |
| PocketBase | 首次 `pnpm dev` 自动下载固定版本和匹配当前平台的二进制；`node scripts/release/download-pocketbase.mjs` 可重新下载。 |
| FFmpeg / FFprobe | 媒体功能和桌面运行时准备需要它们。 |
| yt-dlp | 首次 `pnpm dev` 自动下载当前版本到 `.cache/yt-dlp/`。媒体导入（视频和音频）需要它。 |
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
cp .env.example .env
# 填写管理员邮箱与密码，并按需更改开发端口
pnpm dev
```

首次 `pnpm dev` 会在启动前下载两个仓库自带的二进制：固定版本的 PocketBase 进入 `pb/`，当前版本的 yt-dlp 进入 `.cache/yt-dlp/`。两者都只需联网一次，之后的启动直接复用。`YT_DLP_PATH` 可改用开发者自行安装的 yt-dlp；`YT_DLP_DOWNLOAD_BASE` 可把 yt-dlp 下载指向发行目录的镜像。yt-dlp 下载失败不会阻止开发栈启动：脚本打印警告，只有媒体导入会报告缺少该二进制。PocketBase 的显式重下仍使用 `node scripts/release/download-pocketbase.mjs`，CI 和桌面构建也直接调用它。

只有两个开发命令。`pnpm dev` 在本机启动 PocketBase、Web 和 Server。`pnpm dev:remote` 为远程域名增加网关 `scripts/dev-gateway.mjs`。两个命令都并行启动子进程。任一进程退出会停止整组。

端口来自根 `.env`。同名的 shell 变量优先。

| 服务 | 变量 | 默认 | 地址 |
| --- | --- | --- | --- |
| Web | `DBRAIN_WEB_PORT` | 3000 | <http://localhost:3000> |
| Server | `DBRAIN_SERVER_PORT` | 3001 | <http://localhost:3001> |
| PocketBase | `DBRAIN_PB_HTTP` | 127.0.0.1:8090 | <http://127.0.0.1:8090> |
| 网关（仅 `dev:remote`） | `DBRAIN_GATEWAY_PORT` | 8080 | <https://p8080>.<开发域名> |

两个服务占用同一端口时启动直接报错。PocketBase 不会一直等待。

存储策略变量（`DBRAIN_STORAGE_*`）在开发环境同样生效。`pnpm dev` 用根 `.env` 启动 PocketBase 与 Server，因此不上容器也能检查上传上限或配额。具体值与默认值见运维手册。

开发数据默认写入仓库目录 `pb/pb_data`，迁移运行目录为 `pb/pb_data/pb_migrations`。PocketBase 启动器先准备该目录，再创建管理员账号，并显式指定数据、迁移和 hooks 目录。当前 shell 目录不会改变它们。设置 `DBRAIN_PB_DATA_DIR` 时，运行目录也会随之移动。修改 PocketBase 地址时，同时检查后端 `PB_URL`。启动器会拒绝早于 `0000000001_base_schema.js` 基线的数据库。

`.env` 中的 `DBRAIN_ADMIN_EMAIL` 与密码属于运维账号。应用身份使用普通 `users` 集合。同名的 shell 变量优先于文件。管理员配置更改后，运行 `pnpm pb:admin` 同步开发库账号。

用 `pnpm --filter <package> <script>` 单独运行某个包，或用 `pnpm dev` 运行完整服务栈。

## 媒体导入（视频与音频）

视频节点和音频节点都能从媒体网站导入。两种类型共用一个实现：类型决定站点清单、清晰度或音质映射，以及下载后的步骤（视频打包 HLS，音频检查容器）。

| 层 | 文件 |
| --- | --- |
| 领域端口 | `backend/domain/src/ports/media-download.ts`（`IMediaDownloader`、`IMediaProbe`、清晰度/字幕/进度类型）、`media-sites.ts`（`MEDIA_SITES`、`IMediaSiteCatalog`）、`media-site-auth.ts`（`IMediaSiteAuthRepository`、`IMediaBrowserDetector`）、`media-import-job.ts`（`IMediaImportJobStore`）、`media-transcode.ts`（`IAudioTranscoder`）。 |
| 共享类型 | `packages/interfaces/src/media-import.ts`（`MediaKind`、`MediaImportProgress`、错误码）。错误线格式在 `packages/utils/src/media-import.ts`。 |
| 基础设施 | `backend/infrastructure/src/downloaders/`：`media-sites.ts`（8 个站点）、`media-quality.ts`、`vtt-parser.ts`、`yt-dlp-media-downloader.ts`、`yt-dlp-media-probe.ts`、`media-browser-detector.ts`。另有 `storage/media-import-jobs.ts`、`storage/media-cookie-cipher.ts`、`repositories/pocketbase-media-site-auth.repository.ts`。 |
| 应用层 | `backend/application/src/commands/media/media-import.service.ts`（`probe`、`import`、`job`、`confirm`、`cancel`、`sweep`）、`media-auth.service.ts`（两种登录方式）、`cookie-file.ts`（Netscape 解析与域名过滤）。 |
| tRPC | `backend/adapter-front/src/trpc/router/file.ts`：`mediaSites`、`importMediaCookies`、`connectMediaSiteWithBrowser`、`verifyMediaSite`、`disconnectMediaSite`、`probeMediaSource`、`importMedia`、`mediaImportJob`、`confirmMediaImport`、`cancelMediaImport`，以及 `onMediaImportProgress` 订阅。 |
| API 客户端 | `packages/api-client/src/file-analysis.ts`：`probeMediaSource`、`importMedia`、`mediaImportJob`、`confirmMediaImport`、`cancelMediaImport`、`mediaSites`、`importMediaCookies`、`connectMediaSiteWithBrowser`、`verifyMediaSite`、`disconnectMediaSite`、`MediaImportRequestError`。 |
| UI | `packages/ui/src/components/node-content/`：`media-url-import-dialog.tsx`、`media-site-capsules.tsx`、`media-site-login-panel.tsx`、`media-probe-card.tsx`、`media-import-progress-view.tsx`、`use-media-site-auth.ts`、`use-media-url-import.ts`。 |

### 新增固定站点

在 `backend/infrastructure/src/downloaders/media-sites.ts` 的 `MEDIA_SITES` 中增加一个 `MediaSiteDefinition`。为它填写稳定的 `key`、`name`、支持的 `kinds`、`hosts`、一行 `loginHint` 和公开的 `probeUrl`。胶囊与 URL 匹配会跟随该定义。站点 key 以文本存储，不需要 PocketBase 迁移。Cookie 过滤器会自动保留新 `hosts` 的 Cookie。

### 字幕与歌词

`vtt-parser.ts` 把 WebVTT 文件转换为字幕 cue。它同时支持 `HH:MM:SS.mmm` 和 `MM:SS.mmm` 时间戳；音乐站点使用后一种。它去掉内联标签，把同一条 cue 的多行用 `\n` 连接，丢弃结束时间早于开始时间的 cue，并按开始时间排序。超过 30,000 条 cue 或 8 MiB 的轨道会被截断并标记 `truncated`。节点只保留一条轨道，因为时间戳数据没有语言维度。

### 导入任务

一次导入可能持续数分钟，并且必须在对话框关闭后继续。任务存储为每个任务保留一个目录：

```text
<DBRAIN_MEDIA_IMPORT_DIR>/<ownerId>/<jobId>/
  session.json    状态、URL、格式、阶段、百分比、结果
  download/       yt-dlp 输出：源文件、部分文件、缩略图
```

`running` 和 `interrupted` 保留已下载的部分。`completed` 保留结果，直到客户端写入节点并确认。`failed` 和 `cancelled` 立即删除目录。启动时，存储把所有 `running` 任务改为 `interrupted`，因为其进程已不存在。清理每小时运行一次，删除超过 24 小时的 `interrupted` 与 `completed` 任务，以及没有 session 文件的目录。默认根目录是 `<system temp>/dbrain-media-imports`；`DBRAIN_MEDIA_IMPORT_DIR` 可改变它。使用保存的登录时，下载器会把临时 `cookies.txt` 以权限 `0600` 写入 `<jobDir>/download/cookies.txt`；该文件随任务目录一起删除。

`CONCURRENT_FRAGMENTS = 4` 是下载器中的常量，因此分片下载会传 `--concurrent-fragments 4`。渐进式下载忽略它。它没有用户设置，也没有环境变量。并发限制由应用层执行：每个用户两个，全局四个。

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

端口全部来自根 `.env`。`DBRAIN_GATEWAY_PORT`（默认 8080）是网关，也是地址 `https://p<DBRAIN_GATEWAY_PORT>.<DBRAIN_DEV_DOMAIN>` 中的端口。`DBRAIN_WEB_PORT`、`DBRAIN_SERVER_PORT`、`DBRAIN_PB_HTTP` 是三个上游。

远程形态下 Next 只绑回环。只有网关对外监听（`DBRAIN_GATEWAY_HOST`，默认 0.0.0.0）。`DBRAIN_DEV_DOMAIN` 只在启动时打印地址。它不参与监听。

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

PocketBase 默认使用 `pb/pocketbase`（Windows 为 `.exe`）。应用从 PATH 查找 FFmpeg 和 FFprobe。可以设置 `DBRAIN_POCKETBASE_PATH`、`FFMPEG_PATH`、`FFPROBE_PATH`。媒体导入会调用 `yt-dlp`；`pnpm dev` 会把它下载到 `.cache/yt-dlp/` 并把该路径交给 Server，`YT_DLP_PATH` 可覆盖路径或二进制名。

```bash
pnpm dev:desktop
# 或在当前目标平台生成安装包
pnpm build:desktop
```

Tauri 的 `beforeDevCommand` 和 `beforeBuildCommand` 先准备运行时，再启动或构建前端。`pnpm --filter desktop build` 只生成静态前端。它不能代替原生应用验证。生成资源位于 `apps/desktop/src-tauri/runtime`。安装包通常在 `apps/desktop/src-tauri/target/release/bundle`。

当前发行目标是 Linux x64、Windows x64 和 macOS x64 / arm64。没有 Linux 或 Windows ARM 桌面目标，也不生成 macOS universal 包。Linux 各发行版的兼容性要在实际目标系统上测试。

## 提交前检查

所有者可直接提交到 `develop`，也可合并仓库内的 `feature/*` 或 `fix/*` 分支。不接受外部 PR。提交前运行相关检查：

```bash
pnpm release:check
pnpm check-types
pnpm lint:gate
pnpm test:release
pnpm build
pnpm smoke:server
```

桌面改动还需准备运行时、运行后端 smoke 测试和 Rust 库测试，见[桌面说明](../../apps/desktop/AGENTS.md)。Server smoke 测试只能使用隔离数据。`pnpm lint:gate` 会按已保存基线阻止新增诊断。

## CI/CD 操作

推送到 `develop`、`main` 和仓库内部 PR 会运行 CI。所有者在 `develop` 上为版本提交打标签；标签触发容器平台及签名密钥齐全的桌面目标构建，成功后自动创建发行草稿。用合并提交把 `develop` 晋升到 `main`，再手动公开草稿。详见 [CI/CD 与版本发布](ci-cd.md)。

上面的命令就是 `checks` 作业运行的命令，本地全绿即可预期 PR 全绿。请让本清单与 [CI/CD 与版本发布](ci-cd.md) 同 `.github/workflows/ci.yml` 保持一致。

## 日常维护

更新依赖时修改正确的工作区包和锁文件。数据库模式改动必须新增迁移，不得修改已发行迁移。受影响平台发生变化时，测试原生运行时与备份恢复行为。依赖更新由所有者选择并提交。
