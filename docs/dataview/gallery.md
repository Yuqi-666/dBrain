# 画廊视图（Gallery DataView）设计文档

> 状态：设计稿（未实现）
> 依赖：[README.md](./README.md)、../database-node-design.md

---

## 1. 概述与使用场景

画廊视图把 rows 渲染成卡片墙（网格/瀑布流/列表），突出「封面 + 标题 + 标签」的视觉浏览，适合以内容预览为主的轻量浏览与快速打开。

使用场景：

- database 节点：字段含 url（图片链接）、image 语义的内容，或纯文本卡片墙；点击卡片打开记录详情。
- collection 节点：复用现有节点预览渲染器（image/video/text 等 previews）作为卡片封面，画廊就是「节点卡片墙」。
- 快速浏览：网格/瀑布流扫读大量条目，比表格更直观。

---

## 2. 技术选型

**自研**（不引入第三方画廊库）。

理由：画廊是「卡片布局 + 现有预览复用」的呈现层问题，shadcn/ui + Tailwind 已足够；引入照片墙库（如 react-photo-album）收益有限，且与 collection 的节点预览复用诉求冲突。仅对超大卡片集引入虚拟滚动（可选依赖 react-virtuoso）。

| 依赖 | 用途 |
| --- | --- |
| @workspace/ui（shadcn Card/Badge/Skeleton 等） | 卡片与加载态 |
| @workspace/ui 现有 previews（image-preview 等） | collection 卡片封面复用 |
| react-virtuoso（可选） | 大卡片集虚拟滚动 |

---

## 3. 数据转换适配

### 3.1 rows → cards

~~~ts
// packages/dataview/src/views/gallery/gallery-schema.ts
export function rowsToCards(source: DataViewSource, config: GalleryViewConfig): GalleryCard[] {
  return source.rows.map((row) => ({
    id: row.id,
    title: CellResolver.displayText(row.cells[config.titleField], titleField, resolveNodeTitle) || "未命名",
    cover: resolveCover(row, source, config),   // database: url/image 字段；collection: 节点预览
    badges: config.badgeFields.map((fid) => ({
      fid, text: CellResolver.displayText(row.cells[fid], field),
      color: CellResolver.toColor(row.cells[fid], field),
    })),
    meta: config.metaFields.map((fid) => CellResolver.displayText(row.cells[fid], field)),
  }));
}

function resolveCover(row, source, config) {
  if (source.kind === "collection") return { kind: "nodePreview", nodeId: source.nodeIds[idx] };
  const coverField = source.fields.find((f) => f.id === config.coverField);
  return { kind: "cell", cell: row.cells[config.coverField], field: coverField };
}
~~~

- titleField 默认主列；coverField（database：url 类型，指向图片）；badgeFields（select/multiSelect，渲染成彩色标签）；metaFields（date/number 等次要信息）。
- collection：封面直接复用现有节点预览渲染器（image/video/text/webpage 等），不重复造卡片。

### 3.2 交互

- 点击卡片 → onOpenRecord（database 详情）/ onOpenNode（collection 打开节点）。
- 卡片可多选（长按/Ctrl），用于批量删除/导出。

---

## 4. 配置项（GalleryViewConfig）

~~~ts
export interface GalleryViewConfig {
  titleField: string;               // 卡片标题（text，默认主列）
  coverField?: string;              // 封面字段（url，可选）
  badgeFields?: string[];           // 彩色标签字段（select/multiSelect）
  metaFields?: string[];            // 次要信息字段（date/number 等）

  layout: "grid" | "masonry" | "list";   // 网格 / 瀑布流 / 列表
  cardSize: "small" | "medium" | "large";
  columns: number;                  // 网格列数（responsive 时可作上限）
  showEmptyCover: boolean;          // 无封面时显示占位
  selectable: boolean;              // 多选
  virtualized: boolean;             // 大集虚拟滚动
}
~~~

默认配置（defaultConfig）：titleField 取主列、layout grid、cardSize medium、virtualized = rows 超过阈值时开。

---

## 5. 功能点

- 卡片渲染：封面（图片/节点预览/占位）+ 标题 + 标签（彩色）+ 元信息。
- 布局：网格 / 瀑布流（CSS columns 或 masonry）/ 列表。
- 卡片尺寸与列数调节。
- 虚拟滚动（大集）。
- 多选 + 批量操作（删除/导出）。
- 点击打开记录/节点。
- 空态与封面占位。

---

## 6. 交互与操作方法

| 操作 | 手势/入口 | 结果 |
| --- | --- | --- |
| 打开 | 点击卡片 | onOpenRecord / onOpenNode |
| 多选 | Ctrl/长按点击 | 批量模式 |
| 切换布局 | 工具条布局切换 | grid/masonry/list |
| 调整尺寸 | 工具条尺寸 | small/medium/large |
| 批量操作 | 选中后工具条 | 删除/导出 |

---

## 7. 二次开发要点

1. 复用 CellResolver.displayText / toColor 渲染标题与标签。
2. collection 封面：把现有 previews（image/video/text/webpage/audio 等 preview）包成固定比例缩略容器，避免为画廊重写节点预览。
3. 瀑布流用 CSS columns 或轻量 masonry；大集用 react-virtuoso。
4. 多选状态用共享 useRowSelection，与表格视图一致。

---

## 8. 边界与取舍

- 自研：画廊是呈现层，复用现有 shadcn + 预览渲染器即可，不引入第三方照片墙库。
- 封面降级：database 无 url 封面字段时显示标题首字/图标占位（showEmptyCover）。
- 大集性能：默认渲染前 N 张 + 虚拟滚动；不一次渲染上万卡片。

---

## 9. 开发任务清单

| # | 任务 | 说明 |
| --- | --- | --- |
| L1 | gallery-schema.ts | rowsToCards / resolveCover |
| L2 | 卡片组件 | 封面 + 标题 + 标签 + 元信息 |
| L3 | 布局 | grid/masonry/list |
| L4 | collection 封面复用 | 现有 previews 缩略容器 |
| L5 | 多选 + 虚拟滚动 | useRowSelection + react-virtuoso |
