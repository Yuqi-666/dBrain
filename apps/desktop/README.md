# dBrain Desktop

Tauri 2 + Next.js 静态导出，本地优先运行。图谱、Dashboard、编辑器、主题和快捷键复用 Web 界面。

## 开发与打包

在仓库根目录执行：

```sh
pnpm install
pnpm dev:desktop
pnpm build:desktop
```

仅预览前端：`pnpm --filter desktop dev`，地址 `http://localhost:3002`。
仅构建前端：`pnpm --filter desktop build`，输出 `apps/desktop/out`。
Tauri 打包需要 Rust 和当前平台的系统依赖；Linux 还需要 GTK 3 / WebKitGTK 4.1。

## 本地数据

Desktop 构建固定使用本地 tRPC transport，不创建云端 WebSocket，不启动 PocketBase，也不需要云端登录。首次打开自动创建本地用户、工作空间和全局视图。

本轮存储采用 WebView 的 IndexedDB（`dbrain-desktop-v1`），工作空间、节点、边、视图、语义、标签与 Dashboard 在事务提交后才确认保存。共享服务层保持乐观更新与失败回滚。开发预览与安装后的应用属于不同 origin，数据相互独立；当前仅支持单窗口。

每次写入与同步 outbox 在同一事务中提交，带单调递增序号与删除墓碑。`@workspace/adapter-tauri` 导出 `readPendingChanges`、`acknowledgeChanges` 和 `exportLocalSnapshot`，供后续同步与备份适配器使用。云端账号关联、拉取合并、冲突解决和实际同步网络传输尚未实现，不能把 outbox 当作已经完成云端同步。

本地附件暂存为 Data URL，随节点内容一起持久化，重启不会丢失临时 blob URL。大文件会增加数据库与 outbox 体积；原生文件存储、PDF 解析、视频转码仍需后续适配，失败时共享上传流程保留原始文件。IndexedDB 不是独立的 SQLite 文件，清除应用数据会清除本地工作空间。

## 验证

```sh
pnpm --filter desktop typecheck
pnpm --filter desktop lint
pnpm --filter @workspace/adapter-tauri test
```

本地适配器测试使用 Node 24，覆盖默认工作空间、重启快照、隔离、级联删除、Dashboard 版本冲突和 outbox。

静态导出与 `out` 配置参考 [Tauri 官方 Next.js 指南](https://v2.tauri.app/start/frontend/nextjs/)。

## 全平台构建前提

| 目标 | 原生构建环境 | 额外前提 |
| --- | --- | --- |
| Linux x86_64 | 当前 `yuqi` Ubuntu x86_64 服务器 | Rust/Cargo、WebKitGTK 4.1、GTK 3、OpenSSL、librsvg、C/C++ 工具链；产物为当前服务器架构 |
| Linux ARM64 | ARM64 Linux 构建机/CI，或配置完整 ARM64 交叉工具链的 Linux 主机 | ARM64 sysroot 和对应 WebKitGTK/GTK 开发库；仅添加 Rust target 不够；需在目标发行版实测 |
| Windows x86_64 / ARM64 | Windows 构建机/CI | Rust MSVC target、Visual Studio C++ Build Tools、Windows SDK、WebView2；正式发布另需代码签名证书 |
| macOS Intel / Apple Silicon | macOS 构建机/CI | Xcode Command Line Tools、对应 Rust targets；通用包需两种架构；正式分发另需 Apple Developer 签名与公证 |

所有平台复用相同的 Next.js `out` 资源，原生程序和安装包需分别构建。此处尚未配置跨平台 CI、更新分发或签名凭据；不会把 Linux x86_64 产物标记为 ARM64/Windows/macOS 可执行文件。依赖详情见 [Tauri 官方前提条件](https://v2.tauri.app/start/prerequisites/)。

本设备不执行完整编译，当前验证在 `ssh yuqi` 下的 `~/workspace/projects/dBrain/.scratch/desktop-build-20261010` 进行。隔离目录使用本机代码快照，避免覆盖远端不同版本的工作目录。构建使用 Webpack，Node 堆上限 4 GB，Next.js 预渲染并发限制为 2；原生编译建议 `CARGO_BUILD_JOBS=2`。

## 当前构建结果（2026-10-10）

服务器已成功完成前端生产构建和 Linux x86_64 原生打包，生成 `.deb`、`.rpm`、`.AppImage` 三种安装包；本机副本在 `.scratch/desktop-artifacts`。Desktop 与本地适配器类型检查、Desktop lint、6 项离线逻辑测试通过。静态预览验证了工作空间、语义、文本节点创建，节点重载后可搜索，以及 Dashboard 本地保存。

服务器无桌面会话，原生窗口运行与各目标系统安装测试尚未执行；当前安装包只针对 Linux x86_64。Windows/macOS/ARM64 构建与运行验证需要上表环境。
