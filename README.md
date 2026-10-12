# dBrain

dBrain 是一个知识工作空间：用节点记录内容，用关系连接知识，用图谱和 Dashboard 组织工作。Web 端连接自托管服务，桌面端在设备上运行完整本地后端，支持离线使用。

当前产品版本为 **0.1.0**，处于内部测试阶段。Linux x64、Windows x64、macOS Intel 和 Apple Silicon 已完成统一候选构建；签名、公证及各平台人工验收仍需完成。Linux 容器支持 amd64 / arm64。源码仓库与内测下载渠道目前均为私有。

## 能做什么

- 在工作空间中管理文本、富文本、图片、PDF、音视频、网页、网站、集合和数据库节点。
- 用关系、语义和标签组织知识，在图谱中浏览和编辑。
- 在 Dashboard 和数据视图中整理内容。
- 桌面版携带 Node、PocketBase 和媒体处理运行时，用户无需安装开发工具。

桌面本地数据与 Web 服务端数据分别保存，当前没有云端同步和应用内自动更新。

## 文档

| 我想做什么 | 阅读入口 |
| --- | --- |
| 安装、开始使用、备份个人数据 | [使用手册](docs/usage.md) |
| 配置开发环境、理解目录、修改和检查代码 | [开发手册](docs/development.md) |
| 部署容器、监控、升级、备份和恢复 | [运维手册](docs/operations.md) |
| 了解 CI、四端构建、签名和发布门禁 | [构建与发布](docs/release-workflow.md) |
| 确认哪些已验证、哪些仍待验收 | [发布状态](docs/release-readiness.md) |

完整索引见 [docs](docs/README.md)。CI 按改动范围运行，并缓存 pnpm、Next.js、Rust 依赖及 Docker 构建层；四端安装包与完整候选仍手动触发。

## 开发快速开始

准备 `.node-version` 指定的 Node 与 pnpm 9.0.0，并确保开发机有 FFmpeg / FFprobe。

```bash
pnpm install --frozen-lockfile
node scripts/release/download-pocketbase.mjs
cp .env.example .env
# 编辑 .env，填写 DBRAIN_ADMIN_EMAIL 和 DBRAIN_ADMIN_PASSWORD
pnpm dev
```

打开 `http://localhost:3000`。端口在 `.env` 里配；远程域名开发用 `pnpm dev:remote`，见 [docs/development.md](docs/development.md)。运维管理员账号与应用用户账号用途不同：应用用户通过注册页创建，管理员用于 PocketBase 管理。

桌面开发还需要 Rust 和对应平台原生依赖，然后运行 `pnpm dev:desktop`。详细前提见开发手册。

## 技术结构

Web 使用 Next.js / React，桌面使用 Tauri 2；两端共享界面、领域模型和应用服务。后端使用 Node 与 PocketBase，附件和数据库存放于服务端数据卷或桌面应用数据目录。

```text
apps/web、apps/desktop → packages（界面、状态、客户端）
                      → apps/server → backend → PocketBase
```

## 授权

本软件闭源，保留全部权利。使用与分发须依据权利人的单独书面授权，详见 [LICENSE](LICENSE)。第三方组件遵循各自许可证，其声明及所需源码材料应随发行提供。
