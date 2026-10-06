# 闸门台账

> 这是本批次的**唯一进度真相源**。里程碑进度以本文件的「状态」列为准，不以提交历史或口头约定为准。
> 规程见 [README.md §6](./README.md#6-闸门规程用户介入)。用户操作清单在**各章文件**里（本文件只记结论与迭代）。

**状态图例**

| 状态            | 含义                                                                       |
| --------------- | -------------------------------------------------------------------------- |
| `未开工`        | 该章代码尚未开始                                                            |
| `开发中`        | 主 agent / 子 agent 正在实现，闸门尚未提交给用户                            |
| `待测`          | 已实现、自检（typecheck + lint diff + `agent-browser` 预跑）通过，等用户实测 |
| `不通过 (n)`    | 用户实测有失败项，迭代轮次 n；失败项与归因见该条目                          |
| `通过`          | 三条通过判据全部满足（[README.md §6.2](./README.md#62-通过判据三条同时满足)） |
| `环境受限`      | 该条部分项目在本机无法验收（如真机、secure context），已记录降级验收方式      |

---

## 1. 总表

| 闸门 | 里程碑                     | 章文件                                     | 状态   | 轮次 | 日期 | 遗留 |
| ---- | -------------------------- | ------------------------------------------ | ------ | ---- | ---- | ---- |
| G0   | M0 基线与验证闭环          | [spine.md](./spine.md#m04-闸门-g0--用户操作清单) | 未开工 | —    | —    | —    |
| G1   | M1 数据脊柱                | [spine.md](./spine.md#m14-闸门-g1--用户操作清单) | 未开工 | —    | —    | —    |
| G2   | M2 图标与封面              | [node-content-ui.md](./node-content-ui.md) | 未开工 | —    | —    | —    |
| G3   | M3 text 单块 + rich-text 头部 | [node-content-ui.md](./node-content-ui.md) | 未开工 | —    | —    | —    |
| G4   | M4 灵动岛 P0               | [dynamic-island.md](./dynamic-island.md)   | 未开工 | —    | —    | —    |
| G5   | M5 image 批注              | [annotation.md](./annotation.md)           | 未开工 | —    | —    | —    |
| G6   | M6 媒体与时间戳笔记        | [media.md](./media.md)                     | 未开工 | —    | —    | —    |
| G7   | M7 PDF 自绘与批注          | [annotation.md](./annotation.md)           | 未开工 | —    | —    | —    |
| G8   | M8 灵动岛 P1 预览面板      | [dynamic-island.md](./dynamic-island.md)   | 未开工 | —    | —    | —    |
| G9   | M9 灵动岛 P2+P3 搜索与清理 | [dynamic-island.md](./dynamic-island.md)   | 未开工 | —    | —    | —    |
| G10  | M10 dashboard P0           | [dashboard.md](./dashboard.md)             | 未开工 | —    | —    | —    |
| G11  | M11 dashboard P1           | [dashboard.md](./dashboard.md)             | 未开工 | —    | —    | —    |
| G12  | M12 selectors P2 收尾      | [node-content-ui.md](./node-content-ui.md) | 未开工 | —    | —    | —    |
| G13  | M13 dashboard P2+P3        | [dashboard.md](./dashboard.md)             | 未开工 | —    | —    | —    |

**并行窗口登记**（[README.md §3.2](./README.md#32-并行窗口必须由主-agent-显式开启并登记到-gatesmd)）：目前**无开启**。开工时在此登记一行，写明该窗口的 owner、文件白名单与「相交面为空」的依据。

| 窗口 | 章        | 开启前提（必须已落地）                                                        | 登记状态 |
| ---- | --------- | ----------------------------------------------------------------------------- | -------- |
| W0   | M4 ∥ M2/M3 | M0 过 G0（registry 可写，`motion` 装得上）                                     | 未开启   |
| W1   | M2        | 主 agent 冻结 `node-media/` 的导出与 props 形状                                | 未开启   |
| W2   | M5        | 主 agent 冻结 `annotation/types.ts` 与 `geometry.ts` 签名（另独占 `annotation-layer.tsx`） | 未开启   |
| W3   | M10       | 主 agent 冻结 `DashboardItem`/`DashboardLayout`、`dashboardStore` 切片、`dashboard-config.ts` | 未开启   |
| W4   | M13       | M11 已落 `dashboard_pages` 的 tRPC 契约；`dashboard-header.tsx` 由主 agent 先写成两个插槽 | 未开启   |
| W5   | M6        | 主 agent 冻结 `media/types.ts`（`MediaController` / `TimestampNoteMarks` / `formatTimeMs`） | 未开启   |

**明确不开窗的章**：M7（pdfjs 渲染 / 批注坐标链 / toolbar 三面都改 `geometry.ts` 或 `annotation-canvas.tsx`）、M3（编辑器与只读渲染器共享同一 schema 文件）。

---

## 2. 单条闸门的记录格式

复制下面这段填。**「用户结论」一栏必须是用户的原话或明确判定**，不能由主 agent 代写。

```markdown
### G<n> — <里程碑名>

- 状态：待测 / 不通过 (n) / 通过 / 环境受限
- 提交：`<sha>`（该章的提交序列）
- 自检：typecheck diff = <新增 0 / 消失 n>；lint diff = <…>；`agent-browser` 预跑 = <截图路径 / 未做>
- 用户操作清单：见 <章文件> §<n>
- 用户实测结果：
  | # | 结果 | 证据 | 备注 |
  | - | ---- | ---- | ---- |
  | 1 | ✅ / ❌ | | |
- 失败项与归因：（实现缺陷 / 设计缺陷 → 已登记 README §9 Rn / 环境受限 → 降级方式）
- 迭代：
  - G<n>-r1：<改了什么> → 重测结果
- 遗留不阻塞项：（逐条，含「谁在什么时候补」）
- 用户结论：（原话）
```

---

## 3. 迭代记录规则

1. **同一闸门重测不算新章节**，只加一条 `G<n>-r<m>`。轮次从 1 开始，`不通过 (n)` 的 n = 当前轮次。
2. 每次迭代都要在**同一条目**里记「改了什么」——不要新开条目，否则历史会散。
3. 失败归因只有三种（[README.md §6.3](./README.md#63-不通过时的处置)）：实现缺陷 → 回改；设计缺陷 → 登记 [README.md §9](./README.md#9-与设计文档的偏差登记) 后就地决策；环境受限 → 记降级方式并标 `环境受限`。
4. **禁止**在闸门未通过时开工下一个里程碑（W0 这类已登记的并行窗口除外，且仍需分别判定）。
5. 每轮重测前都要跑一次 `bash docs/plan/baseline.sh`，把 diff 贴进条目——否则「无新增错误」这条判据没有证据。

---

## 4. 用户操作清单的位置索引

| 闸门 | 清单所在节                                                          | 特别说明                                                     |
| ---- | ------------------------------------------------------------------- | ------------------------------------------------------------ |
| G0   | [spine.md §M0.4](./spine.md)                                         | 第 4 条（起服务）可并入 G1                                    |
| G1   | [spine.md §M1.4](./spine.md)                                         | 第 4/5 条在 **PB 后台**验写路径，不依赖前端 UI                 |
| G2   | [node-content-ui.md](./node-content-ui.md)                           | 图标/封面的四种来源 + 键盘可达性 + 不碰 `content` 的抓包证据   |
| G3   | [node-content-ui.md](./node-content-ui.md)                           | text 旧形状惰性升级 + 头部与正文不互相覆盖                     |
| G4   | [dynamic-island.md](./dynamic-island.md)                             | 形变可打断 / 原点从底部 / `prefers-reduced-motion` 降级        |
| G5   | [annotation.md](./annotation.md)                                     | **真机笔测试**是主闸门；第一步先实测 `http://localhost:3000` 能否从平板访问（R23：同 netns 下它就是 secure context） |
| G6   | [media.md](./media.md)                                               | 时间戳跳转 ±0.5s + HLS 时间轴偏移 + 并发写者不互相抹除         |
| G7   | [annotation.md](./annotation.md)                                     | 第 3 页的圈在缩放/翻页/旋转后仍贴合 + worker 不 404 + iframe 降级 |
| G8   | [dynamic-island.md](./dynamic-island.md)                             | `isFocus` 语义与今天一致 + 触摸端点击触发                      |
| G9   | [dynamic-island.md](./dynamic-island.md)                             | `Tab` 能正常遍历 + 全仓无 `quick-panel` 引用                   |
| G10  | [dashboard.md](./dashboard.md)                                       | RGL 交互手感；**刷新丢几何是预期**（R6），不判失败              |
| G11  | [dashboard.md](./dashboard.md)                                       | 只读 widget（`canEditViews=false`）+ 刷新后几何不变            |
| G12  | [node-content-ui.md](./node-content-ui.md)                           | 裁剪不改原 blob + 离线时 P0 的 tab 不受影响                    |
| G13  | [dashboard.md](./dashboard.md)                                       | 抽屉拖入落点 + 多页面深链 + worker 数量 = 1                    |
