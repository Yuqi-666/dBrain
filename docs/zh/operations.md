# 运维手册

## 部署模式与账号

Web 部署有四部分：PocketBase、Node Server、Web 和 nginx Gateway。PocketBase 把数据库和附件保存在 `pb_data` 卷。只有 Gateway 发布宿主机端口，默认是 `127.0.0.1:3000`。其他服务留在容器网络内。

`DBRAIN_ADMIN_EMAIL` 与密码属于 PocketBase 运维超级管理员。它们不是用户登录账号。应用以终端用户令牌读取数据库。容器在启动前按配置创建或更新管理员账号。要长期修改密码，请修改部署配置并重启服务。

## 从源码构建自托管环境

在仓库根目录配置并启动：

```bash
cp .env.example .env
# 编辑 .env，填写 DBRAIN_ADMIN_EMAIL 与 DBRAIN_ADMIN_PASSWORD
# 后续命令保持一致使用同一个私有 Compose project 名
docker compose -p dbrain config --quiet
docker compose -p dbrain up --build --wait
docker compose -p dbrain ps
```

本机 Docker 复用同一 builder 的已有层。GHA 缓存属于远端工作流，本地 Compose 不下载它。该构建使用当前源码，不是已发布的发行镜像。打开 `http://localhost:3000`，检查页面、用户登录和文件功能。

## 使用候选或发行镜像

对于 v0.1.3 之后的 Release，从对应版本下载 `dbrain-deploy-vVERSION.tar.gz` 和 `SHA256SUMS`。核对归档的哈希后，把它解压到部署目录。归档根目录包含 `docker-compose.yml`、`nginx.conf`、`update.sh`、`.env.example`、`compose.release.yml` 和 `container-report.json`。较新的归档还包含 `compose.updater.yml` 和 `deploy/updater/`。这些文件应保持同级。

v0.1.3 把相同的部署文件作为独立制品发布。需分别下载，并把 `default.env.example` 改名为 `.env.example`。检查来源 commit 和容器报告中的镜像 digest。

已发布 Release 可手动使用其固定 digest 的覆盖层。在该部署目录执行：

```bash
cp .env.example .env
# 填写管理员邮箱与密码
# 私有 GHCR 镜像先登录：docker login ghcr.io
docker compose -p dbrain -f docker-compose.yml -f compose.release.yml config --quiet
docker compose -p dbrain -f docker-compose.yml -f compose.release.yml pull
docker compose -p dbrain -f docker-compose.yml -f compose.release.yml up --no-build --wait
```

后续 Compose 命令使用同一个 digest 覆盖层：此处手动部署使用 `compose.release.yml`，运行 `update.sh` 后使用 `compose.current.yml`。部署目录和 project 名保持稳定。改动会误建新卷。内部候选完成部署验证后才能承载重要数据。

## 一条命令更新

在同一个部署目录保留 `docker-compose.yml`、`nginx.conf`、`update.sh` 和 `.env`。候选包含前三个文件。v0.1.3 之后的 Release 把它们放在部署归档中。在该目录运行脚本。若 GHCR 包是私有的，先使用有读取包权限的令牌登录 `ghcr.io`。

```bash
sh update.sh candidate-RUN_ID-ATTEMPT
sh update.sh vVERSION
```

参数精确选择一组已测试的镜像。脚本拉取三个镜像并解析仓库 digest。然后停止服务，把完整的 PocketBase 数据卷复制到 `backups/`，写入 `compose.current.yml`，启动服务，并等待所有服务健康。PocketBase 在打开数据库前准备迁移运行目录。把 `compose.current.yml` 保留在部署目录。后续手动 Compose 命令使用它。

若启动失败，脚本保持服务停止并输出备份位置。启动旧镜像前先恢复匹配的数据库备份。旧镜像本身不能撤销迁移。脚本固定使用 Compose project `dbrain`。

## 自动更新候选

在部署目录的 `.env` 中设置 `DBRAIN_AUTO_UPDATE=true`，然后在该目录启动独立的更新项目：

```bash
docker compose -f compose.updater.yml up -d --build
docker compose -f compose.updater.yml logs -f updater
```

更新容器每 15 秒检查一次由标签触发并成功的 `release-candidate.yml` 运行。它跳过更旧的运行编号，发现新候选时调用 `update.sh`。该脚本备份数据库，并等待所有应用服务健康。

如果更新失败，自动尝试暂停，`.auto-update-failed` 记录目标。检查应用，必要时恢复匹配的备份。完成恢复后再删除该标记。

将 `.env` 改为 `DBRAIN_AUTO_UPDATE=false` 即可暂停更新检查，无需重启更新容器。更新容器使用独立的 Compose 项目，因此应用重启不会停止它。它需要 Docker 套接字和部署目录的写权限。只在可信主机上授予该权限。

GitHub API 未认证时每小时只允许 60 次请求。在 `.env` 中设置 `DBRAIN_GITHUB_TOKEN` 可把上限提高到 5000 次。更新容器发送条件请求，结果未变化时不下载响应体。请求失败且剩余配额接近 0 时，它会等到整点重置。轮询间隔与 token 处理逻辑都在更新容器镜像内。

修改 `deploy/updater/watch.sh` 后需要重建该容器：`docker compose -f compose.updater.yml up -d --build`。使用 `docker compose -f compose.updater.yml down` 停止它。

更新容器在容器内调用 Compose，并把部署目录挂载到 `/deployment`。Compose 按 project 目录解析 Compose 文件中的相对路径。因此 `update.sh` 把部署目录的宿主机路径作为该 project 目录传入，`nginx.conf` 的 bind mount 仍落在宿主机上。该路径取自更新容器自身的挂载表。仅当该探测无答案时（例如使用命名卷），才在 `.env` 中把 `DBRAIN_DEPLOYMENT_DIR` 设为绝对路径。project 目录若留在容器内，守护进程会在宿主机上创建空目录，gateway 随之启动失败。

## PocketBase 结构更新

`pb/pb_migrations_base/0000000001_base_schema.js` 是新数据库的创始基线。变更目录目前为空。未来加入的脚本只用于升级从该基线创建的数据库，发布后不得改写。数据库旁的 `pb_migrations/` 是持久运行目录。首次启动时，新数据库只接收基线脚本。

后续启动时，PocketBase 只把晚于该数据库起点的变更复制到运行目录。备份时将该目录与数据库、附件一起保留。本项目不支持早于此基线的数据库，启动会拒绝它。如需另行迁移其数据，应保留备份。

今后每次结构变更，都要修改基线脚本并增加一个编号更大的变更脚本。分别测试新库和上一个受支持版本的升级。

## 环境配置

| 变量 | 用途 |
| --- | --- |
| `DBRAIN_ADMIN_EMAIL` | 必填。运维管理员邮箱。 |
| `DBRAIN_ADMIN_PASSWORD` | 管理员密码。不要提交到 Git。 |
| `DBRAIN_ADMIN_PASSWORD_FILE` | 密码文件优先。容器需要挂载该文件。 |
| `DBRAIN_BIND_HOST` | Gateway 宿主机监听地址。默认 `127.0.0.1`。 |
| `DBRAIN_PORT` | Gateway 宿主机端口。默认 `3000`。 |
| `DBRAIN_AUTO_UPDATE` | `true` 启用独立更新容器。`false` 暂停。默认为 `false`。 |
| `DBRAIN_GITHUB_TOKEN` | 可选，供更新容器使用的 token。它把 GitHub API 上限从每小时 60 次提高到 5000 次。这个公开仓库的 token 无需权限范围。 |
| `DBRAIN_DEPLOYMENT_DIR` | 部署目录的宿主机绝对路径。它覆盖更新容器探测到的路径。通常留空。 |
| `DBRAIN_PUBLIC_ORIGIN` | 通常留空。前置代理改写 Host 时设为浏览器精确 Origin。 |
| `DBRAIN_IMAGE_PREFIX` / `DBRAIN_VERSION` | 源码 Compose 的镜像名与标签。发行以 digest 覆盖层为准。 |
| `DBRAIN_STORAGE_USER_QUOTA_BYTES` | 每个用户可存储的总字节数。`0` 关闭配额。默认 `10737418240`（10 GiB）。 |
| `DBRAIN_STORAGE_MAX_IMAGE_BYTES` | 单张图片上限，字节。默认 `33554432`（32 MiB）。 |
| `DBRAIN_STORAGE_MAX_VIDEO_BYTES` | 单个视频上限，字节。默认 `2147483648`（2 GiB）。 |
| `DBRAIN_STORAGE_MAX_AUDIO_BYTES` | 单个音频上限，字节。默认 `536870912`（512 MiB）。 |
| `DBRAIN_STORAGE_MAX_PDF_BYTES` | 单个 PDF 上限，字节。默认 `536870912`（512 MiB）。 |
| `DBRAIN_STORAGE_MAX_OTHER_BYTES` | 其他类单个文件上限，字节。默认 `268435456`（256 MiB）。 |

使用密码文件时，添加 Compose override，只挂载 PocketBase 服务。把文件只读挂载到容器内路径，例如 `/run/secrets/pb-admin-password`。把变量设为该容器路径。只设置宿主机路径不会创建挂载。限制 `.env` 和密码文件的读取权限。

### 存储策略

六个变量控制一个用户可占用的存储。`DBRAIN_STORAGE_USER_QUOTA_BYTES` 是每个用户一份的总预算，覆盖整个账号，所以服务端为 PDF 封面或 HLS 打包写出的文件也计入。五个分类变量各自限制单个文件。分类先看浏览器上报的 MIME 类型，再看文件扩展名：图片、视频、音频、PDF、其他。

值写成整数字节，不支持单位后缀，例如 `10737418240` 是 10 GiB。留空或值无效时回落到内置默认值；笔误不会锁死存储。只有 `DBRAIN_STORAGE_USER_QUOTA_BYTES` 接受 `0`，表示关闭总配额。分类上限必须为正数。高于上传通道 2 GiB 上限的值不会带来额外效果，因为通道会先拒绝更大的文件。

API 与 PocketBase 都会执行这些值，所以 `docker-compose.yml` 把同一个 `.env` 中的值同时传给两个服务。API 在暂存分片之前拒绝过大的文件，PocketBase hook 拒绝每一次写入，包括浏览器直传和服务端自己生成的派生文件。两份配置必须保持一致；compose 文件已经这样处理。

已有数据库第一次收到媒体库变更时，迁移会记录它能在本地存储中读到的每个文件的大小。文件存放在 S3 的部署无法在那里读取，因此这些旧记录保持 0 字节，配额只统计新文件。0 字节不会阻止新的上传。

调低配额在下次上传时生效。它不会删除已有文件。资源库界面显示用量，在那里删除资源才会释放字节；删除节点不会删除它的附件。

## 指定部署端口

在部署目录的 `.env` 文件中设置 Gateway 宿主机端口。

```dotenv
DBRAIN_BIND_HOST=127.0.0.1
DBRAIN_PORT=18080
```

源码部署运行 `docker compose -p dbrain up --build --wait`。手动安装的 Release 运行下列命令。运行 `update.sh` 后，将 `compose.release.yml` 换成 `compose.current.yml`。

```bash
docker compose -p dbrain -f docker-compose.yml -f compose.release.yml up --no-build --wait
```

在宿主机打开 `http://127.0.0.1:18080`。宿主机 HTTPS 反向代理可以转发到该地址。修改后再次运行 up 重建端口映射。restart 不应用新映射。

3001 和 8090 是容器内部端口。不要随宿主机端口修改它们，也不要公开它们。浏览器通过 Gateway 的 `/trpc` 与 `/pb/` 访问 API 和文件。

需要直接连接宿主机端口时，按网络策略把 `DBRAIN_BIND_HOST` 设为指定接口或 `0.0.0.0`。默认回环供同宿主机代理使用。同名的 shell 变量优先于 `.env`。端口占用时更改 `DBRAIN_PORT` 并再次运行 up。独立实例使用不同 project 名和不同端口。核对各实例的数据卷。

## 外部访问与 HTTPS

在宿主机或受控入口部署 TLS 反向代理。把流量转发到 Gateway。保留原始 Host 头。支持 WebSocket。按实际附件大小设置上传限制。Gateway 只监听回环，远程浏览器无法直接访问它。

只有代理改写 Host 时才设置 `DBRAIN_PUBLIC_ORIGIN`。使用浏览器精确 Origin，例如 `https://dbrain.example.com`，包含 scheme 和非默认端口。不要加尾斜杠。该值是精确替换规则。填错会使 API 与 WebSocket 的来源验证失败。工作空间随后一直加载。

不要把 PocketBase 管理接口发布到公网。临时管理访问可添加 override，把 8090 映射到宿主机回环地址。使用 SSH 隧道。操作后删除端口映射。

## 日常观察与故障排查

```bash
docker compose -p dbrain ps
docker compose -p dbrain logs --tail=100 pocketbase server web gateway
curl -fsS http://127.0.0.1:3000/health
```

由 `update.sh` 管理的部署，给这些命令加上 `-f docker-compose.yml -f compose.current.yml`。手动安装的 Release 使用 `compose.release.yml` 作为第二个文件。必须应用同一配置。健康接口只说明服务可达。还要检查登录、工作空间、附件和媒体。

| 现象 | 优先检查 |
| --- | --- |
| Compose 无法渲染 | `.env` 文件存在，配置中有管理员邮箱。 |
| PocketBase 循环重启 | 密码、密码文件挂载及其权限、卷权限、启动日志。 |
| 页面打开但一直加载，或 API 返回 403 | 代理 Host、Origin、WebSocket 转发和 `DBRAIN_PUBLIC_ORIGIN`。 |
| pull 报告权限错误 | 私有 GHCR 登录身份和包读取权限。 |
| 升级后像全新安装 | project 名、部署目录和实际 `pb_data` 卷。 |
| 自动更新后 gateway 停住 | 更新容器的 project 目录，以及宿主机上多出的 `/deployment` 路径。 |
| 视频或 PDF 失败 | 对应后端日志、附件访问权限和运行时依赖。 |

日志可能包含业务信息。分享日志前删除隐私数据。把管理员 CLI 指向数据目录，容器内为 `/pb_data`。目录错误会误建空数据库。

## 备份与恢复

先停止写入，再停止整组服务。在停止状态备份完整的 `pb_data` 卷。该卷保存 SQLite 数据库和附件。记录实际卷名。

保存同版本部署配置、镜像 digest 和密钥配置。限制备份的访问权限。定期检查恢复。

下一个例子备份源码部署的文件。镜像部署的每条 Compose 命令都要加上 `-f docker-compose.yml` 和相应的 digest 覆盖层。

```bash
docker compose -p dbrain stop
backup_dir="backups/pb-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$backup_dir"
pb_container=$(docker compose -p dbrain ps -aq pocketbase)
test -n "$pb_container"
docker cp "$pb_container:/pb_data/." "$backup_dir/"
# 检查副本、数据库和附件。另存部署配置，然后启动服务。
docker compose -p dbrain start
```

目录名使用 UTC 时间。不要把备份放入 Git。把副本转移到访问受限的备份存储。

恢复前检查源卷、目标卷和备份版本。在停止状态把完整备份恢复到专用目标卷。不要把旧备份与含较新数据的目录混合。不要运行 `down -v`。该命令会删除数据卷。

升级流程有六步。

1. 停止写入。
2. 做完整备份。
3. 在隔离副本上测试新版本的迁移和权限。
4. 切换到新发行覆盖层。
5. 启动并检查用户、附件和媒体。
6. 恢复流量。

回滚需要旧数据和旧镜像 digest。只换旧镜像不能撤销数据库迁移。用独立 project 和卷做恢复演练。测试检查数据和附件后，再操作生产数据。

桌面个人数据的备份与恢复见[使用手册](usage.md)。发行与验收流程见 [CI/CD 流水线](ci-cd.md)。
