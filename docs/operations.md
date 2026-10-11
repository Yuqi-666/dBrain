# 运维手册

## 部署模式与账号

Web 自托管由 PocketBase、Node Server、Web 与 nginx Gateway 组成。PocketBase 数据库和附件保存在 `pb_data` 卷；只有 Gateway 默认发布到宿主机 `127.0.0.1:3000`，其他服务保持在容器网络内。

`DBRAIN_ADMIN_EMAIL` 与密码是 PocketBase 运维超级管理员，不是用户登录账号。应用以终端用户令牌访问数据库。容器启动前会按配置 upsert 管理员，因此长期修改密码应修改部署配置，再重启服务。

## 从源码构建内部测试环境

在仓库根目录配置并启动：

```bash
cp .env.example .env
# 编辑 .env，填写 DBRAIN_ADMIN_EMAIL 与 DBRAIN_ADMIN_PASSWORD
# 私有、唯一的 Compose project 名需在后续命令中保持一致
docker compose -p dbrain config --quiet
docker compose -p dbrain up --build --wait
docker compose -p dbrain ps
```

本机 Docker 可复用同一 builder 的已有层；GitHub Actions 的 GHA 缓存只在远端工作流接入，本地 Compose 不会自动下载这些缓存。以上从当前源码构建，不等同于使用已验收发行镜像。访问 `http://localhost:3000`，确认页面、用户登录和文件功能。

## 使用候选或发行镜像

从匹配候选 / Release 获取部署目录，确保以下文件同级：`docker-compose.yml`、`compose.release.yml`、`nginx.conf`、`.env.example`。**compose.release.yml 由候选组装生成，不是 deploy 目录中预先存在的文件。** 检查来源 commit、SHA256SUMS 和容器报告中的 digest。

在该部署目录执行：

```bash
cp .env.example .env
# 填写管理员邮箱与密码
# 私有 GHCR 镜像需要先以具有读取包权限的账号 docker login ghcr.io
docker compose -p dbrain -f docker-compose.yml -f compose.release.yml config --quiet
docker compose -p dbrain -f docker-compose.yml -f compose.release.yml pull
docker compose -p dbrain -f docker-compose.yml -f compose.release.yml up --no-build --wait
```

每次 pull / up 均带发行覆盖层，它固定已验证镜像 digest。不要只依赖可变版本标签。部署目录和 project 名保持稳定，防止误建新卷。当前无公开正式发行，内部候选也需完成部署验证后再承载重要数据。

## 环境配置

| 变量 | 用途 |
| --- | --- |
| DBRAIN_ADMIN_EMAIL | 必填，运维管理员邮箱 |
| DBRAIN_ADMIN_PASSWORD | 管理员密码，不提交到 Git |
| DBRAIN_ADMIN_PASSWORD_FILE | 优先读取密码文件；容器中必须有相应文件挂载 |
| DBRAIN_BIND_HOST | 默认 127.0.0.1，Gateway 宿主机监听地址 |
| DBRAIN_PORT | 默认 3000，Gateway 宿主机端口 |
| DBRAIN_PUBLIC_ORIGIN | 通常留空；前置代理改写 Host 时设为浏览器精确 Origin |
| DBRAIN_IMAGE_PREFIX / DBRAIN_VERSION | 源码 Compose 镜像名与标签；发行以 digest 覆盖层为准 |

选择密码文件时另加仅挂载 PocketBase 服务的 Compose override，将文件只读挂载到例如 `/run/secrets/pb-admin-password`，变量设置为该容器内路径；只设置宿主机路径不会自动挂载。限制 .env 和密码文件的读取权限。

## 指定部署端口

支持指定 Gateway 的宿主机端口，在部署目录 .env 中设置：

```dotenv
DBRAIN_BIND_HOST=127.0.0.1
DBRAIN_PORT=18080
```

源码部署运行 `docker compose -p dbrain up --build --wait`；发行部署运行：

```bash
docker compose -p dbrain -f docker-compose.yml -f compose.release.yml up --no-build --wait
```

访问宿主机 `http://127.0.0.1:18080`，或让宿主机 HTTPS 反向代理转发到它。修改后需运行 up 重建端口映射，仅 restart 不会应用新映射。3001 / 8090 是容器内部端口，无需随宿主机端口修改或额外公开，浏览器通过 Gateway 的 `/trpc` 与 `/pb/` 访问 API 和文件。

需要直接连接宿主机端口时，可按网络策略将 DBRAIN_BIND_HOST 设置为指定接口或 0.0.0.0；默认回环供同宿主机代理使用。shell 同名变量优先于 .env，端口占用时更换 DBRAIN_PORT 并重新 up。独立实例使用不同 project 名和端口，核对各自数据卷。

## 外部访问与 HTTPS

在宿主机或受控入口部署 TLS 反向代理，转发到 Gateway。保留原始 Host，支持 WebSocket，并按实际附件大小设置上传限制。默认只监听回环，远程浏览器不会直接访问到它。

只有代理改写 Host 时才设置 `DBRAIN_PUBLIC_ORIGIN`，如 `https://dbrain.example.com`，含 scheme 和非默认端口，无尾斜杠。该值是精确替换规则，填错会使 API / WebSocket 来源校验失败，常见表现是工作空间持续加载。

不要把 PocketBase 管理接口直接暴露到公网。临时管理访问可用额外 override 将 8090 映射到宿主机回环地址，再通过 SSH 隧道访问，操作后撤除端口映射。

## 日常观察与故障排查

```bash
docker compose -p dbrain ps
docker compose -p dbrain logs --tail=100 pocketbase server web gateway
curl -fsS http://127.0.0.1:3000/health
```

发行部署下的这些命令也应带 `-f docker-compose.yml -f compose.release.yml`，以使用同一配置。健康接口仅说明服务可达，仍需验证登录、工作空间、附件和媒体。

| 现象 | 优先检查 |
| --- | --- |
| Compose 无法渲染 | .env 是否存在、管理员邮箱是否填写 |
| PocketBase 循环重启 | 密码是否存在、密码文件挂载及权限、卷权限、启动日志 |
| 页面打开但一直加载 / API 403 | 代理 Host、Origin、WebSocket 转发及 PUBLIC_ORIGIN |
| pull 提示无权限 | 私有 GHCR 登录身份和包读取权限 |
| 升级后像全新安装 | project 名、部署目录、实际 pb_data 卷是否变化 |
| 视频 / PDF 失败 | 对应后端日志、附件访问权限与运行时依赖 |

日志可能包含业务信息，分享前脱敏。管理员 CLI 必须指定正确数据目录（容器为 `/pb_data`），否则可能误建一个空数据库。

## 备份与恢复

先停止写入，并停止整组服务；在停止状态备份整个 `pb_data` 卷，包括 SQLite 数据库和附件。记录实际卷名，保存同版本部署配置、镜像 digest 和密钥配置。备份应限制访问并定期验证恢复。

以下是仓库源码部署的文件备份示例，发行部署需在每条 Compose 命令中加入两个 -f 参数：

```bash
docker compose -p dbrain stop
backup_dir="backups/pb-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$backup_dir"
pb_container=$(docker compose -p dbrain ps -aq pocketbase)
test -n "$pb_container"
docker cp "$pb_container:/pb_data/." "$backup_dir/"
# 确认复制成功、数据库与附件完整，并另存部署配置后再启动
docker compose -p dbrain start
```

目录名使用 UTC 时间。不要将备份放入 Git；将副本转移到受限的备份存储。恢复前核对源卷、目标卷与备份版本，在停机状态把完整备份恢复到专用目标卷；不要把旧备份混合覆盖到仍含新版本数据的目录。不要运行 `down -v`，它会删除数据卷。

升级流程：停止写入 → 完整备份 → 在隔离副本测试新版本迁移和权限 → 切换新发行覆盖层 → 启动并验证用户、附件、媒体 → 恢复流量。

回滚需要同时恢复旧数据和旧镜像 digest；仅换回旧镜像不能撤销数据库迁移。恢复演练使用独立 project / 卷，确认数据与附件完整后再操作生产。

桌面个人数据的备份与恢复见 [使用手册](usage.md)，发行与验收过程见 [构建与发布](release-workflow.md)。
