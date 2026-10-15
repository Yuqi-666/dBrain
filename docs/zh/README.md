# dBrain 文档（中文）

本目录是 [docs](../README.md) 手册的中文版本。内容对应当前 0.1.0 内测代码与工作流，面向开发者、部署维护者和使用者。

| 文档 | 内容 |
| --- | --- |
| [开发手册](development.md) | 环境、项目结构、Web 与桌面开发、质量门禁、日常维护 |
| [运维手册](operations.md) | 源码部署、发行镜像部署、访问配置、备份恢复、故障排查 |
| [使用手册](usage.md) | 安装、账号与数据、工作空间、图谱、Dashboard、升级 |
| [CI/CD 流水线](ci-cd.md) | 推送门控、trailer、验证器、合并门、标签、已声明的平台、发布候选、验收门禁、发布门禁、仓库策略、缓存 |

## 文档维护

除章节明确要求其他目录外，命令都在仓库根目录执行。

把 `RUN_ID`、`ATTEMPT`、`SOURCE_COMMIT`、`VERSION` 替换为实际值。变量定义以仓库 `.env.example`、`deploy/.env.example` 和对应脚本为准。

当前 docs 树不保存旧版发布报告和验证日志。请从 Git 历史查询。

发布验收记录写入 `docs/release-acceptance/vVERSION.json`。首次填写真实验收记录时创建该目录。

不要把凭据、个人数据或完整生产日志提交到文档。
