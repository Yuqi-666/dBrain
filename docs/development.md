# 开发手册

## 环境

| 工具 | 项目要求 |
| --- | --- |
| Node | 按 `.node-version`，当前为 24.15.0 |
| pnpm | 9.0.0，见根 package.json |
| Rust | 按 rust-toolchain.toml，当前为 1.99.0；桌面开发需要 |
| PocketBase | 用仓库下载脚本获取固定版本、匹配当前平台的二进制 |
| FFmpeg / FFprobe | 开发媒体功能及桌面运行时准备需要 |
| Docker Compose | 容器开发、测试和部署需要 |

锁文件安装使用 `pnpm install --frozen-lockfile`。不要把 node_modules、构建产物、运行时资源、真实 .env 或本地数据库提交到仓库。

## 项目结构

| 目录 | 职责 |
| --- | --- |
| apps/web | Next.js Web 应用、登录注册与工作空间入口 |
| apps/desktop | Next.js 静态前端、Tauri 原生程序与运行时打包 |
| apps/server | Node 服务入口、桌面本地运行模式 |
| backend/domain | 领域模型 |
| backend/application | 应用用例 |
| backend/infrastructure | 数据库、存储等实现 |
| backend/adapter-front、adapter-back、adapter-tauri | 边界适配 |
| packages | 共享 UI、编辑器、图谱、数据视图、状态、接口与客户端 |
| pb | 开发 PocketBase 与数据；迁移和 hooks 以启动脚本指定目录为准 |
| deploy | Dockerfile、网关配置和部署环境模板 |
| scripts/release | 版本、工作流检查、打包校验、候选和发行脚本 |
| .github/workflows | CI、桌面、容器、候选与发行工作流 |

改业务行为时先定位共享领域和应用层，再修改平台适配与 UI。避免将平台细节直接扩散到领域模型。

## Web 与后端开发

```bash
pnpm install --frozen-lockfile
node scripts/release/download-pocketbase.mjs
cp .env.example .env
# 填写管理员邮箱与密码
pnpm dev:full
```

`dev:full` 并行启动 PocketBase、Web 和 Server；任一进程退出会停止整组。默认地址：

| 服务 | 地址 |
| --- | --- |
| Web | http://localhost:3000 |
| Server | http://localhost:3001 |
| PocketBase | http://127.0.0.1:8090 |

开发数据默认写入仓库 `pb/pb_data`。PocketBase 启动器显式指定数据、迁移和 hooks 目录，不随 shell 当前目录变化。自定义 `DBRAIN_PB_DATA_DIR`、`DBRAIN_PB_HTTP` 时，同步检查后端 `PB_URL`。

`.env` 中的 `DBRAIN_ADMIN_EMAIL` 与密码用于运维账号；应用身份使用普通 users 集合。shell 同名变量优先于文件。更新管理员配置后可用 `pnpm pb:admin` 同步开发库账号。

`pnpm dev` 是宽泛的 workspace 并行入口；需要完整 Web 服务栈时优先使用 `pnpm dev:full`。

## 公网域名远程开发与自定义端口

可以把远程开发环境通过 HTTPS 域名提供给浏览器。非 localhost 域名下，客户端自动使用同域 `/trpc` 和 `/pb`，不会访问浏览器本机的 3001 / 8090。反向代理必须同时处理这两个路径和 Next 开发热更新。

### 启动开发服务

原始 `pnpm dev:full` 的 Web 命令固定为 `next dev -p 3000`。根 .env 目前只由 PocketBase 子进程加载，不会自动传递给并行的 Web / Server；在 .env 写 PORT 不能调整整个开发栈，也没有现成的 DBRAIN_WEB_PORT 参数。

默认 Web 3000、Server 3001、PB 8090 可以直接 `pnpm dev:full`，下面代理中的端口相应改成默认值。需要 Web 4000、Server 4001、PB 8091 时，可使用等价的三进程启动命令（Bash）：

```bash
PB_URL=http://127.0.0.1:8091 DBRAIN_PB_HTTP=127.0.0.1:8091 pnpm exec concurrently -k -n pb,web,server 'pnpm --filter server dev:pb' 'pnpm --filter web exec next dev -p 4000 -H 127.0.0.1' 'PORT=4001 pnpm --filter server dev'
```

管理员配置仍从根 .env 读取。仅给 Server 设置 PORT，避免它与 Next 争用端口。域名访问支持自定义后端端口；localhost 浏览器访问仍使用客户端固定的 3001 / 8090，不能自动识别自定义后端端口。

### 配置开发域名与反向代理

将域名解析到入口并准备 TLS 证书。在 `apps/web/next.config.mjs` 的 nextConfig 对象中添加实际域名，重启 Web：

```js
allowedDevOrigins: ['dev.example.com'],
```

当前仓库尚未设置该域名列表，需要按部署修改。此配置用于 Next 开发来源检查，见 [Next 官方说明](https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins)。

以下为同机 nginx 示例。map 放在 http 上下文，server 按现有配置加载；替换域名和 TLS 路径：

```nginx
map $http_upgrade $dbrain_dev_connection {
    default upgrade;
    '' close;
}
server {
    listen 443 ssl;
    server_name dev.example.com;
    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;
    client_max_body_size 100m;
    location = /trpc {
        proxy_pass http://127.0.0.1:4001;
        proxy_http_version 1.1;
        proxy_set_header Host $http_host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $dbrain_dev_connection;
        proxy_read_timeout 3600s;
    }
    location ^~ /pb/api/ {
        proxy_pass http://127.0.0.1:8091/api/;
        proxy_set_header Host $http_host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_read_timeout 120s;
    }
    location /pb/ { return 404; }
    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $http_host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $dbrain_dev_connection;
        proxy_buffering off;
        proxy_read_timeout 3600s;
    }
}
```

开发注册、登录和附件直接走 PB API，保留 `/api/` 路径与 collection rules 用户权限。不要照搬生产 `/pb/ → Server` 文件网关，否则开发注册 / 登录 API 会被路径白名单拒绝。PB 管理 UI 不在代理范围；这不等于阻止所有管理 API，维护者可另加管理 API 拒绝规则。

保留 Host 时 Server 的同源判断可通过，DBRAIN_PUBLIC_ORIGIN 通常无需设置；若代理改写 Host，启动时把 `DBRAIN_PUBLIC_ORIGIN=https://dev.example.com` 传给 Server，不能只写根 .env 就假定 Server 已读取。

开发入口用于受控测试，在代理或网络入口限制访问。阻止公网直连 Server 的 4001 端口（当前程序绑定 0.0.0.0）；本例 PB / Web 绑定回环。应用登录并不保护全部开发工具入口，开发服务不应作为开放生产站点。

### 检查链路

```bash
curl -fsS https://dev.example.com/pb/api/health
```

再验证注册 / 登录、工作空间、上传读取附件与代码热更新。浏览器 Network 中 `/trpc` 应升级为 WebSocket（101），请求不应指向浏览器 localhost。health 不能代替登录与文件权限验证。本次提供配置方法，尚未部署或验证实际域名。

## 桌面开发

桌面前端复用 Web，Tauri 启动携带的 Node 后端与 PocketBase。它不依赖开发 Web 服务栈，也不读取根 .env 管理员账号。

原生构建必须在对应 OS / 架构准备运行时：

| 平台 | 额外依赖 |
| --- | --- |
| Linux | WebKitGTK 4.1、GTK 3、OpenSSL、librsvg、C/C++ 工具链；AppImage 还需 patchelf 和 GStreamer 工具、base/good/libav 插件 |
| Windows | Rust MSVC、Visual Studio C++ Build Tools、Windows SDK、WebView2 |
| macOS | Xcode Command Line Tools、匹配架构的运行时和媒体依赖 |

Ubuntu 可参考工作流安装依赖：

```bash
sudo apt-get update
sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev libssl-dev librsvg2-dev build-essential patchelf ffmpeg gstreamer1.0-tools gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-libav
```

PocketBase 默认使用 `pb/pocketbase`（Windows 为 .exe），FFmpeg / FFprobe 从 PATH 查找，也可设置 `DBRAIN_POCKETBASE_PATH`、`FFMPEG_PATH`、`FFPROBE_PATH`。

```bash
pnpm dev:desktop
# 或在当前目标平台生成安装包
pnpm build:desktop
```

Tauri 的 beforeDevCommand / beforeBuildCommand 会准备运行时，再启动或构建前端。`pnpm --filter desktop build` 只生成静态前端，不能代替原生应用验证。生成资源位于 `apps/desktop/src-tauri/runtime`，安装包通常在 `apps/desktop/src-tauri/target/release/bundle`。

当前发行目标为 Linux x64、Windows x64、macOS x64 / arm64，没有 Linux / Windows ARM 桌面发行目标，也不生成 macOS universal 包。跨发行版 Linux 兼容性仍要在实际目标系统测试。

## 提交前检查

```bash
pnpm release:check
pnpm check-types
pnpm lint:gate
pnpm test:release
pnpm build
```

按改动范围补充桌面后端验证：

```bash
pnpm --filter desktop runtime:prepare
node apps/desktop/scripts/backend-smoke.mjs
cargo test --locked --release --lib --manifest-path apps/desktop/src-tauri/Cargo.toml
```

Cargo 检查前需准备 Tauri 配置要求的运行时及前端资源。Server smoke 只能针对隔离测试库，不能直接对生产服务执行。

`lint:gate` 与已有基线比较，阻止新增诊断，不代表全仓零警告。修复存量诊断后可用 `node scripts/release/lint-gate.mjs --update-baseline` 缩减基线；扩大基线应在代码审查中说明原因。

## 日常维护

从 main 创建短期开发分支，向 main 或 develop 发起 PR。非草稿 PR 执行按路径选择的 CI，main 推送也检查；普通开发分支和 develop 推送不再额外运行一轮。

新增 JS 依赖时更新对应 workspace 和 pnpm-lock.yaml；新增 Rust 依赖同步 Cargo.lock。已发行迁移不直接修改，新增 migration 并验证旧数据升级、权限和附件归属。修改 Node、PocketBase、FFmpeg、Tauri 或原生依赖后，重新验证受影响平台的运行时、安装包和备份恢复。

版本使用 `pnpm release:version VERSION` 同步，再运行 `pnpm release:check`。构建和发布入口见 [构建与发布](release-workflow.md)。
