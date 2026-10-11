# dBrain 文档

这套文档对应当前 0.1.0 内测代码与工作流，面向开发者、部署维护者和使用者。

| 文档 | 内容 |
| --- | --- |
| [开发手册](development.md) | 环境、项目结构、Web / 桌面开发、检查与维护约定 |
| [运维手册](operations.md) | 源码部署、发行镜像部署、访问配置、备份恢复、故障排查 |
| [使用手册](usage.md) | 安装、账号与数据、工作空间、图谱、Dashboard、升级 |
| [构建与发布](release-workflow.md) | CI 触发范围、单平台诊断、统一候选、签名、公证与发行 |
| [发布状态](release-readiness.md) | 已验证边界与正式发行前仍需完成的项目 |
| [PocketBase 连接审查](pocketbase-connections.md) | 各端连接入口、身份与文件链路、修复及验证边界 |

## 文档维护

命令从仓库根目录执行，除非章节明确要求进入发行部署目录。示例中的 `RUN_ID`、`ATTEMPT`、`SOURCE_COMMIT`、`VERSION` 应替换为实际值。环境变量的定义以仓库 `.env.example`、`deploy/.env.example` 与对应脚本为准。

旧版发布报告和验证日志已从当前 docs 树移除，可通过 Git 历史查询。发布验收记录仍按工作流约定写入 `docs/release-acceptance/vVERSION.json`；该目录在首次填写真实验收记录时创建。不要将含凭据、个人数据或完整生产日志的文件提交到文档。
