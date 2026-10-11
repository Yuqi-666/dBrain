# dBrain

dBrain 是包含 Web 与离线桌面端的知识工作空间。服务端使用 Node/PocketBase；桌面端使用 Tauri，并携带本地数据库、后端及媒体处理运行时。软件目前按闭源、保留全部权利发布；第三方组件遵循各自许可证。

- [开发维护、自动构建与发布手册](docs/release-workflow.md)
- [实际验收结果与剩余发布门槛](docs/release-readiness.md)
- [桌面开发与运行时说明](apps/desktop/README.md)

## 开发

安装 `.node-version` 指定的 Node、pnpm 9.0.0；桌面开发还需要 `rust-toolchain.toml` 指定的 Rust，以及 desktop README 中的系统依赖和 FFmpeg。

```sh
pnpm install --frozen-lockfile
node scripts/release/download-pocketbase.mjs
cp .env.example .env
# 在 .env 填写 DBRAIN_ADMIN_EMAIL 与 DBRAIN_ADMIN_PASSWORD
pnpm dev:full
```

默认 Web 地址为 `http://localhost:3000`，服务端端口为 3001，PocketBase 为 8090。开发数据库位于 `pb/pb_data`，启动器显式加载仓库 migrations/hooks；不会按当前 shell 目录另建数据库。`DBRAIN_PB_DATA_DIR`、`DBRAIN_PB_HTTP` 可覆盖开发数据库和监听地址；后端 `PB_URL` 需与自定义端口一致。

桌面开发入口为 `pnpm dev:desktop`，原生安装包入口为 `pnpm build:desktop`；必须在目标 OS/架构准备运行时。

## 检查与构建

```sh
pnpm release:check
pnpm check-types
pnpm lint:gate
pnpm test:release
pnpm build
```

`lint:gate` 阻止新增 lint 诊断，存量诊断明确保留在基线；它不表示全仓严格 ESLint 零错误。独立后端与媒体集成验证使用 `pnpm smoke:server`，仅对隔离测试数据运行。

CI 自动检查发往 main/develop 的非草稿 PR 与 main 提交，并按变更路径选择任务；文档改动只运行轻量分类。`Release candidate` 手动编排四平台桌面、两架构容器候选；`Publish accepted release` 依据逐平台验收记录和不可变 digest 发布。首次启用、签名 Secrets、审批、部署备份及恢复步骤见工作流手册。当前仍有原生平台和第三方材料等验收门槛，不能把工作流配置完成视为正式发行验收通过。
