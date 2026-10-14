## 问题与结果

说明触发场景、原行为及改动后的行为。

## 验证

列出实际运行的检查、结果和未执行的相关平台验证。基础检查：`release:check`、`check-types`、`lint:gate`、`test:release`。

推送门控：贴出 `pnpm gate` 写入的 `Gate-Tree`、`Gate-Checks` 与 `Gate-Report`。未使用统一入口时说明原因。

## 发行影响

涉及数据库迁移、运行时、CSP、原生依赖、签名或发布工作流时，说明备份/恢复影响及需要重做的验收；涉及 lint 基线时，说明增减原因。关联问题或候选 run/commit（适用时）。
