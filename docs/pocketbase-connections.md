# PocketBase 连接审查

审查日期：2026-10-11（UTC）。范围为本轮源码与上传菜单修复。本报告记录源码审查和本地验证；线上部署版本以部署目录的 `DEPLOYED_COMMIT`、`DEPLOYMENT_IMAGES.txt` 与操作记录为准。

## 连接入口与身份来源

| 入口 | 地址与身份 | 审查结果 |
| --- | --- | --- |
| Web SDK / XHR 上传 | 本地开发：当前 loopback 主机的 8090 端口；代理/容器：同源 `/pb`；身份读取 `pb_token` Cookie | 修复 XHR 缺少令牌；SDK 每次请求读取当前 Cookie，刷新、注销后不会继续使用旧 SDK 令牌 |
| Web tRPC | 本地开发：当前 loopback 主机的 3001 端口与 `/trpc`；代理/容器：同源 `/trpc` | 与上传共用 Cookie 读取函数；WebSocket 重连时读取最新身份 |
| Web 首次初始化 | `apps/web/app/providers.tsx` | 初始化成功后才渲染子组件，避免首次媒体地址解析早于客户端创建 |
| 文件展示 / 下载 | `resolveFileUrl`、图片/图标/封面、PDF、音视频、编辑器 | 统一使用当前 PB 基址；归一化已保存的 `/pb/api/files/…` 和相对桌面会话路径，避免重复前缀 |
| Desktop 前端 | Tauri 提供动态 loopback 网关及 `/session/<secret>`；会话令牌保存至 SDK | 使用内存身份存储；切换后端地址时重新创建客户端，取消旧请求；初始化与定期刷新逻辑保留 |
| Web 文件网关 | `apps/server/src/index.ts` → 内网 PB | 校验 Authorization/Cookie、Origin；只允许文件读取和文件创建，不代理管理接口；媒体保留 Range 与 HLS 路径重写 |
| Desktop 网关 | `apps/server/src/desktop/runtime.ts` → 随机端口 PB | 校验会话路径和 Origin，注入设备身份与内部访问密钥；PB hook 拒绝绕过网关 |
| 服务端仓储 | infrastructure PB 单例，所有实体仓储、Dashboard | 使用 AsyncLocalStorage 请求令牌；关闭共享客户端自动取消；Dashboard 显式令牌，不修改共享 authStore |
| 登录 / 用户查询 / 令牌校验 | 临时客户端调用 authWithPassword、authRefresh、带令牌查询用户 | 登录/验证客户端隔离；并发用户不会改写共享身份；受保护 tRPC 操作重新验证令牌 |
| 服务端 PDF / 视频 / 文件存储 | 限制文件路径并重定向至本机 PB；请求令牌与文件工作空间上下文 | 阻止任意 URL 代理；上传衍生文件保留 workspaceId |
| 启动与部署 | dev 启动器、容器内网、桌面进程监督 | 开发默认 PB 监听 127.0.0.1:8090；公网部署经 server 文件网关，桌面经带随机会话路径的本地网关 |

## 本轮修复

1. 上传原来只读 SDK authStore，而 Web 登录只写 Cookie，导致直连开发 PB 的上传请求无身份。
2. SDK 改用内存身份存储；Web 请求动态读取 Cookie，Desktop 继续使用设备令牌。
3. Web 初始化门控避免子组件在 PB 客户端尚未创建时解析文件地址。
4. 打开 `127.0.0.1:3000` 时不再强制访问 `localhost:8090`，保持 Cookie 主机一致。
5. 已保存的相对网关文件路径转换为当前后端的文件路径；外部绝对 URL 保持原样。
6. 上传菜单在用户点击时同步打开文件选择器，按钮显式使用 `type="button"`。

## 验证与边界

- `pnpm test:release`：39 项通过，包括新增 Cookie 刷新/注销、SDK 内存存储、后端切换、loopback 主机与文件路径测试。
- API client 与 Web 类型检查通过；前一轮上传菜单 UI 类型检查通过。
- server 构建通过；真实临时 PB + server 冒烟通过：注册登录、跨用户并发与工作空间权限、上传下载、Cookie 媒体、Range、Origin/管理接口拒绝、PDF/FFmpeg/HLS、事件隔离与边创建。
- 本轮未重新打包或运行 Windows/macOS/Linux 桌面安装器，桌面网关按源码与现有自动化测试审查；未验证浏览器文件选择器的实际操作。
- 本地开发直接访问 PB，PB JWT 本身是无状态令牌；server 的退出登录拒绝列表只对经过 server 的请求生效，且仅存在于当前 server 进程。生产应保持 PB 不对公网开放。
- IPv6 loopback 使用保留的 IPv6 主机名，要求开发后端也监听 IPv6；默认启动脚本只监听 IPv4。
- 外部绝对媒体 URL 不自动迁移。旧记录中若保存了固定端口或过期桌面会话的绝对 URL，需要单独迁移，不能将任意外部地址替换为本地文件。
