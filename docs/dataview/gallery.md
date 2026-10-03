# 画廊视图（Gallery DataView）设计文档

> 状态：**已实现**（`packages/dataview/src/views/gallery/`）
> 依赖：[README.md](./README.md)、../database-node-design.md
> 实现说明：本文档保留原始设计；§0 记录实际落地的差异与文件地图。

---

## 0. 实现状态（先读这一节）

已经落地的是画廊视图的完整链路：卡片渲染（封面 / 标题 / 彩色标签 / 值行）、三种布局
（网格 / 瀑布流 / 列表）、卡片尺寸与响应式列数、按需渲染（网格与列表真实窗口化，瀑布流增量
分页）、多选与批量删除、点击打开记录、封面降级占位，以及「添加记录 / 卡片配置 / 布局」三个
工具栏控件（右侧功能组只剩外壳的「更多」）。**没有新增任何第三方依赖**（设计稿里的
`react-virtuoso` 未引入，见下）。

第二轮做了一次 UI/UX 重做（视觉层级 + 交互设计，见 §0.2）：标签按选项着色、列表行右置
名称/值列、封面按图片自身比例、**卡片墙的键盘导航**、Shift 连选、右键菜单。方向是「克制
重排」：不引入新色板与新字体，仍只用 shadcn 语义色与 `--primary` 表达用户已介入的状态。

与原设计的差异（都是有意的）：

| 原设计                                               | 实际落地                                                                                                                 | 原因                                                                                                                                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| §2 可选依赖 `react-virtuoso`                         | **自研窗口化**（`board/use-gallery-scroll.ts`）：网格 / 列表按固定行高做真窗口，瀑布流用 `IntersectionObserver` 增量分页 | 网格的行高由卡片尺寸决定，是个定值，「哪些行在屏幕里」是一次除法；而 CSS 多列容器没有行可以整除，第三方虚拟列表也帮不上忙。少一个依赖、少一次 API 适配                                     |
| §7.2 collection 封面「把现有 previews 包成缩略容器」 | 新增 `@workspace/ui` 的叶子组件 **`NodePreviewCover`**（只画媒体），由 `resolveNode` 合约提供节点                        | hover 面板 `PreviewBlock` 带标题头、语义标签与整段正文，卡片自己就有标题/标签，直接嵌进去是两层卡片。封面只借「媒体」这一层：图片/视频/PDF 用封面图，文本/富文本用正文摘录，其余用类型图标 |
| §6「批量操作 \| 选中后工具条」                       | **删掉**：没有批量操作按钮/菜单，唯一需要落点的批量动作「删除选中」在已选中卡片的右键菜单里（第五轮）                    | 「批量选择」不该是一个要按钮化的模式；右对齐功能区里一个「随选中出现」的按钮还会把它自己和左侧邻居一起推动（表格的「删除选中」就是这么抖起来的，见 AGENTS.md UI 约定）                     |
| §3.2 卡片可多选（长按/Ctrl）                         | **Ctrl/Cmd/Shift 点击与键盘手势**；点击卡片本体是打开记录。卡片上不放勾选框（第五轮）                                    | 卡片就是记录本身，浮层控件会挡住封面又抢点击；选择是手势，选中态由卡片自身的 `--primary` 边框表达                                                                                          |
| §5「多选 + 批量操作（删除/导出）」                   | **删掉导出**（第五轮删除了自研 CSV `core/export.ts`）                                                                    | 卡片墙没有画布、也没有自己的功能项；导出是表格的强项（`vtable-export`），画廊里那半个导出菜单只会让右侧功能区多一个入口                                                                    |
| §4 `coverField` 只说 url                             | database 的封面字段接受 `url` / `text`（值看起来像地址时）/ `relation`（指向图片/视频/PDF 节点，用它的节点预览）         | 把图片地址粘进文本字段非常常见；`relation` 让「一行指向一个媒体节点」也能有封面                                                                                                            |
| §4 collection 也用 `coverField`                      | collection **忽略** `coverField`，每行就是一个节点，封面固定为该节点的预览                                               | 集合的行本来就是节点，节点预览比任何投影单元格都更完整；字段面板在这种情况下只显示说明                                                                                                     |

### 0.3 第三轮重构（统一记录面 + 配置瘦身）

第三轮把画廊接进 dataview 的**统一记录面**，并砍掉一半配置。方向是「少即是多」：
一张卡片就是封面 + 标题 + 若干字段值，能推断的都不再让用户配。

| 之前                                      | 现在                                                                                                | 原因                                                                               |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 点击卡片 → `onOpenRecord` / `onOpenNode`  | 点击卡片 → 宿主的**统一记录编辑页**（右侧 Sheet，`useRecordActions().openRecord` → `onOpenRecord`） | 「点击记录」在四个视图里应该是同一件事；卡片不再自己决定去哪                       |
| 自建右键菜单（打开/选择/删除）            | `shared/record-menu.tsx` 的 `RecordContextMenu` + 一条画廊独有的「选择」                            | 通用项（打开记录/复制/删除）由外壳提供，视图只追加自己的                           |
| 自建 `CardChip`（灰底 + 圆点）            | `shared/field-value.tsx` 的 `FieldValue` / `OptionBadge`（染色 shadcn `Badge`）                     | 同一个选项在表格/看板/画廊/记录页必须长得一样                                      |
| `badgeFields` + `metaFields` 两份字段列表 | 一份 `cardFields`；渲染器按字段类型决定「标签」还是「名称/值行」                                    | 两份列表让用户要先决定「这个字段算标签还是算元信息」，而这是字段类型已经回答的问题 |
| `columns`（列数，响应式上限）             | **删掉**：列数由容器宽度与卡片尺寸算出来（`fitColumnCount`）                                        | 一个「上限」在窄窗口下不会生效、在宽窗口下又只是限制，用户没有理由关心它           |
| `virtualized`（长列表按需渲染）           | **删掉**：永远窗口化                                                                                | 关掉它只会让 5000 行卡死，不是一种偏好                                             |
| `showEmptyCover`（无封面时显示占位）      | **删掉**：永远显示占位                                                                              | 关掉它卡片会缺一块，不是一种偏好                                                   |
| `selectable`（允许多选）                  | **删掉**：永远可多选（勾选框悬停出现）                                                              | 同上；批量导出/删除需要它                                                          |
| 「字段 / 布局 / 显示」三个面板            | 「字段 / 布局」两个面板 + 功能区一个固定的「添加记录」按钮                                          | 显示面板的三个开关全被删了；创建记录是每个视图都该有的入口                         |
| 卡片字段列表只显示文本/标签               | 单选多选 → 标签，其余字段 → 名称/值行（`FieldValue` 渲染，含日期、数字、链接、关联）                | 之前 `metaFields` 只显示 `displayText`，日期/数字/链接都没有各自的形态             |

**兼容**：`shared/card-ops.ts` 的 `readCardSettings` 是配置迁移边界 —— 旧配置里的
`badgeFields` + `metaFields` 会被拼接成新的 `cardFields`，所以升级不会丢卡片内容；
旧的 `columns` / `virtualized` / `showEmptyCover` / `selectable` 直接忽略。

**新增交互**：工具栏的「添加记录」（`onRowInsert(createEmptyDataRow(fields))`，空态里也有一个
按钮），以及卡片右键菜单里的统一记录项。

### 0.5 第五轮重构（工具栏与卡片瘦身）

第五轮去掉了「设置按钮高亮」这个说法本身，也把卡片上最后两个悬浮控件删掉：

| 之前                                                    | 现在                                                                                                 | 原因                                                                                  |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 工具条右功能区：`导出`（全部 N 条 / 选中 M 条）+ `更多` | 右功能区**只有** `更多`                                                                              | 画廊没有自己的功能动词；导出菜单里的「全部 N 条 / 选中 M 条」还是随数据变化宽度的读数 |
| 卡片左上角勾选框 + 右上角「…」菜单（悬停浮现）          | **都删掉**：整张卡片可点、右键即记录菜单                                                             | 一张卡片是记录，不是工具栏；浮层控件遮封面、抢点击，还要靠 `group-hover` 在触屏上退化 |
| 各组设置按钮的 `--primary` 高亮（「这个分组设置有值」） | 中性按钮（`SettingsPanel` 不再有 `active`）                                                          | 哪些设置已生效在面板里一眼就能看到，触发器染色只会让人猜颜色含义（用户指定）          |
| 选择靠「勾选框 + Ctrl 点击」                            | 选择靠手势：`Space`、Ctrl/Cmd 点击、Shift 连选、`Ctrl+A`、`Esc`；选中态是卡片自身的 `--primary` 边框 | 与上一条同源；唯一必须落点的批量动作（删除选中）跟着右键菜单走                        |

### 0.6 第六 / 七轮（菜单瘦身 + 无封面 + 角色配置项）

| 之前                                                         | 现在                                                                                                                                    | 原因                                                                                                                                                                         |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 没有封面字段时，每张卡片仍然保留封面区并画首字占位           | **完全不画封面区**（`card.cover === undefined`，与看板同一条 `cardCoverEnabled` 规则）；`null` 才是「有封面来源但这一行空着」→ 首字占位 | 没有封面来源却画一个假封面，正是看板不做的事；两边的封面规则现在是同一条                                                                                                     |
| 网格行高按「封面撑满」设计（`gridRowHeight` 200/252/320）    | 无封面时行高收紧到卡片本体（`NO_COVER_GRID_ROW_HEIGHT` 156 / 紧凑 124）                                                                 | 否则卡片只剩半格内容、下面全是留白，仍然像「留了一块封面」。数值取的是最坏情况（两行标题 + 标签换行 + 两行值）加上余量，因为卡片是 `overflow-hidden`，行高不足会裁掉最后一行 |
| 面板与下拉里有说明文字（列数随窗口宽度自动变化…）            | **删除**，只留控件与空态/禁用态提示                                                                                                     | 触发器已经说了这个菜单是什么（第六轮）。本轮只把表格那四个 `设置…条件` 标题行补了回去，画廊的面板本来就没有标题行                                                            |
| 卡片角色在字段行的「…」菜单里设置（`设为标题` / `设为封面`） | **角色是配置项**：`标题` / `封面` 各一个 `PanelSection` + `FieldSelect`，行的「…」只剩编辑/删除字段，行尾**标注**角色                   | 同一件事在任何视图里都该在同一个位置、用同一个控件设置（第七轮；日历的四个角色配置项同理）                                                                                   |

### 0.4 第四轮重构（卡片与看板统一）

第四轮把「卡片」这件事从两个视图里抽出来，并再砍掉一个工具条按钮。方向仍是「同一个东西只做一遍」：

| 之前                                                       | 现在                                                                                                                                                               | 原因                                                                                                                                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 画廊 `GalleryCard` 与看板 `KanbanCard` 各画各的卡片        | 一张 **`shared/card.tsx` 的 `DataCard`**（封面 + 标题 + 标签 + 值行），看板只是把它包进拖拽 handle                                                                 | 同一个记录在两个视图里必须长得一样；差别只剩排布（`grid`/`masonry`/`list`/`board`）                                                                                               |
| 卡片「值行」是 `名称 值` 两列                              | 只有值（字段名是该行 tooltip），单选/多选仍是染色标签                                                                                                              | 卡片是「一眼」，五组「名称 值」会把它变成表单；需要字段名时有 tooltip、记录编辑页和表格                                                                                           |
| 画廊「字段」面板 = 标题字段 + 封面字段 + 卡片字段复选列表  | **共享的「卡片配置」菜单**：标题 / 封面两个**配置项**（`FieldSelect`）/ 展示模式（常规・紧凑）/ 卡片字段列表（搜索、拖拽、眼睛、行尾角色注解、编辑/删除/新增字段） | 角色是配置项、列表只是字段（第七轮；与日历的四个角色配置项同一套形状）；字段列表与表格的「字段配置」同一套交互（`shared/field-config-list.tsx`），看板用同一个菜单                |
| 画廊封面组件在 `views/gallery/board/gallery-cover.tsx`     | `shared/card-cover.tsx`（比例常量与 `clampCardCoverAspect` 一起搬过去）                                                                                            | 看板选封面字段后用的是同一个封面盒                                                                                                                                                |
| 工具条 `字段 / 布局` + 功能区 `批量操作` 菜单 + `添加记录` | 左：`添加记录 / 卡片配置 / 布局`；右：外壳的`更多`（导出在第五轮删除）                                                                                             | 用户指定；「批量选择」不该是一个要按钮化的模式 —— Ctrl/Cmd 点击、Shift 连选、Ctrl+A、Esc 就够了，唯一需要落点的批量动作「删除选中」放进**已选中卡片的右键菜单**（文件管理器惯例） |
| 右侧 `N 张卡片` / `已选 N` 徽标                            | **删掉**                                                                                                                                                           | 右侧功能组里随数据变化的读数会把整条功能组推来推去（AGENTS.md UI 约定）                                                                                                           |

**默认值**：`cardFieldIds()`（`source/field-utils.ts`）给卡片一套同样的智能默认 —— 所有
单选/多选（渲染成标签）+ 第一个非标题的文本字段（详情行）；看板再排除掉分组字段（它的值就是泳道）。

### 文件地图

```text
packages/dataview/src/views/gallery/
├── gallery-data-view.tsx        # 壳：rows→cards、选择状态、写回链路、能力开关、空态引导（注册表唯一入口）
├── core/
│   ├── config.ts                # 配置自愈（标题/封面/标签/次要信息字段、布局与尺寸枚举）+ 面板选项常量
│   ├── layout.ts                # 卡片几何：尺寸→最小列宽/行高、响应式列数、行窗口（纯算术）
│   └── schema.ts                # rows→cards（标题/封面/标签/元信息），封面来源解析（纯函数）
├── board/
│   ├── gallery-board.tsx        # 布局引擎：网格 / 瀑布流 / 列表 + 三种挂载策略 + 键盘容器
│   ├── gallery-card.tsx         # 单卡片：共享 DataCard + 画廊自己的覆盖层（打开/右键菜单）
│   ├── use-gallery-focus.ts     # 卡片墙的 roving tabindex：方向键移动、Shift 连选、快捷键
│   └── use-gallery-scroll.ts    # 滚动测量 + 网格/列表窗口 + 瀑布流增量分页
└── toolbar/gallery-toolbar.tsx  # 添加记录 / 卡片配置（共享）/ 布局
```

卡片的**本体与配置都不在画廊里**：`shared/card.tsx`（卡片）、`shared/card-cover.tsx`（封面盒）、
`shared/card-ops.ts`（数据与 settings 纯逻辑）、`shared/card-config.tsx`（`卡片配置` 菜单）由看板
与画廊共用 —— 两个视图画的就是同一张卡片。`core/schema.ts` 只负责画廊自己的「行 → 卡片」遍历。

注册表里画廊**没有** `configEditor`（`卡片配置` + `布局` 覆盖了 `GalleryViewConfig` 的每一个键），
所以工具条里也没有「视图配置」兜底弹层。

### 0.1 文件地图上的跨包触点

- `@workspace/ui/components/preview-block/node-preview-cover` —— 节点封面的媒体切片
  （按直接路径引入，见下）。
- `@workspace/ui/components/ui/context-menu` —— 第二轮新增的 shadcn 基础件（右键菜单），
  第五轮之后它是卡片仅剩的那个菜单入口（`GalleryCardItem` 里的 `RecordContextMenu`）。

### 0.2 UI/UX 重做（第二轮）

**视觉。**

- **标签按选项着色**：卡片标签不再是「灰底 + 小圆点」，而是把选项色做成一层**薄涂**
  （`tintColor(option.color, 0.24)`，`shared/color.ts`）。用薄涂而不是实色填充，是为了让
  主题继续拥有文字颜色 —— 实色必须配 `contrastTextColor`，而且一张卡片上四五个饱和标签会
  吵。没有选项的纯文本值、以及解析不出颜色的值，仍然保持 `bg-muted` 中性。
- **列表行用满宽度**：缩略图 · 标题+标签 · 右侧「名称/值」一列（`w-44`，左边一条
  `border-l`）。容器窄于 `GALLERY_LIST_COMPACT_WIDTH`（620px，取实测宽度）时这一列折回
  标题下方，而不是把标题挤成一条线。
- **封面占位**更安静：大号首字 + 加载失败时才出现的小图标，底色 `bg-muted/60`。
- **状态表达分层**：选中 = `border-primary/70 + ring-primary/40`（用户放上去的状态），
  悬停 = 只抬边框与阴影（`border-ring/40 + shadow-md`），键盘焦点 = 焦点环。三者不靠颜色
  单独区分；`--primary` 仍然只用在用户介入的状态上。
- 卡片上曾经的两个浮层控件（勾选框 / 「…」菜单）加了 `backdrop-blur-sm`；**第五轮两者都已删除**。

**交互。**

- **卡片墙是一个 roving tabindex 网格**（`use-gallery-focus.ts`）：整面墙只有一个 Tab 停靠
  点，方向键在卡片间移动（`↓` = `index + columns`），`Home`/`End` 到两端，
  `PageUp`/`PageDown` 翻一屏，`Enter` 打开，`Space` 勾选，`Shift+方向键` 连选，
  `Ctrl/Cmd+A` 全选，`Esc` 清空选择。只对真正消费掉的按键 `preventDefault`，所以悬停层里的
  菜单、输入框仍然拿得到自己的按键。
- **Shift 连选**（鼠标与键盘同一套）：锚点是「最后一次单独点中的卡片」；键盘路径下如果没有
  锚点，就用**移动前聚焦的那张卡片**（否则从空焦点按 Shift+→ 只会选中目标本身）。
- **右键菜单**（打开 / 选择 / 删除记录）是卡片唯一的菜单入口；第五轮删掉了「…」按钮之后，
  鼠标的显式入口就只剩它（以及键盘的 `Space` / `Ctrl+A` / `Esc`）。
- **瀑布流改成行优先顺序**：卡片 _i_ 进第 `i % columns` 列，而不是 CSS 多列的自上而下
  填充 —— 屏上第二张卡曾经是第 8 行，「下一张」也从来不是旁边那张，而这正是方向键语义。
  代价是各列底部参差，那本来也就是瀑布流的样子。
- **光标**：整张卡片可点时给打开按钮 `cursor-pointer`（Tailwind v4 的 `<button>` 默认是
  `cursor: default`，全站按钮都一样，这里只修卡片这个最需要点的地方）。

### 关键实现要点（实测踩过的坑）

- **虚拟窗口要求行高是定值。** 网格 / 列表的卡片行高由 `core/layout.ts` 的
  `gridRowHeight` / `listRowHeight` 给出，`gallery-board.tsx` 把它同时交给
  `useGalleryScroll`（算窗口）和 `gridAutoRows`（排版）；卡片根因此必须 `h-full`。
  两者一旦不一致，挂载的切片就会和滚动条高度错位。
- **瀑布流的 sentinel 是条件渲染的，观察者必须用 callback ref 绑定。**
  sentinel 只存在于瀑布流分支；用「effect + 依赖数组」绑定会在 sentinel 还不存在时
  跑完（那时是网格），切到瀑布流后不再重跑 —— 墙永远停在第一页（浏览器实测：5000 行
  时 40 → 40 不动）。
- **卡片上的控件是覆盖层。** 打开按钮 `absolute inset-0 z-0`，盖在卡片视觉本体（static div）
  之上 —— 第五轮删掉勾选框与菜单之后，这是卡片上**唯一**的覆盖层；再往卡片上加按钮时，记得
  它同样得是 `z-10` 的兄弟节点，否则按不动。
- **画廊的懒加载 chunk 会间接引入 `@workspace/api-client`。**
  `NodePreviewCover` 里要用 `resolveFileUrl` 把 PocketBase 相对路径变成可服务 URL，
  于是 `packages/dataview/tsconfig.json` 必须像 `packages/ui/tsconfig.json` 一样把
  `@workspace/api-client` 及其后端依赖映射进 `paths`，否则 dataview 的 typecheck 会在
  `api-client` 内部报「找不到 `@workspace/adapter-front`」。这里刻意用
  `@workspace/ui/components/preview-block/node-preview-cover` 的**直接路径**而不是
  barrel，避免把 hover 面板与视频播放器（hls.js）一起拖进画廊 chunk。
- **`multiSelect` 的标签是逐个选项渲染的**，颜色按选项在字段里的位置取
  （与看板泳道同一条 `resolveOptionColor`），所以同一个选项在表格/看板/画廊里同色；
  选项已被删除的旧值仍会得到一个稳定色。
- **画廊没有导出。** 第五轮删除了 `core/export.ts`（自研 CSV：UTF-8 BOM + 下一 tick 才
  revoke 的 object URL）。需要导出时用表格视图 —— 那条路径有 `vtable-export` 与列格式。
- **键盘导航的焦点是「重试」出来的，不是等出来的。** 目标卡片通常还不存在（它的行在虚拟
  窗口之外），所以 `use-gallery-focus.ts` 的 effect **不写依赖数组**：第一次尝试只够叫
  board 把那行挂上（`ensureIndexMounted` → 改 `scrollTop` 或 `ensureCount`），而这次重挂
  会再跑一遍同一个 effect，第二次才真的 `focus()`。用「依赖 activeIndex 的 effect」会写不过
  关：挂载发生在效果之后，依赖没变，effect 不会重跑，焦点永远落空。
- **瀑布流的封面比例来自图片自身**（`naturalWidth / naturalHeight`，夹在 4:5–16:9），
  网格则永远填满定高瓦片。没有这层，瀑布流在封面比例一致时和网格长得一模一样，「错落」只剩
  名称。比例是**量出来的**，不是猜的：加载失败就退回 4:3。
- **`group-hover:` 编译在 `@media (hover: hover)` 里。** headless Chromium 默认报
  `hover: none`，悬停态在自动验证里永远不出现 —— 这是测试环境的问题，不是产品的。驱动时必须带上
  `--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4`，
  否则会误判成「悬停反馈坏了」。第五轮之后卡片已经没有依赖悬停才出现的控件（选中态与卡片边框
  是常驻的），但键盘焦点环的验证仍然需要这组开关。
- 画廊是 DOM 视图，没有 `release()` 之类的命令式生命周期；滚动容器由渲染器自己持有
  （外壳的渲染器盒子 `overflow-hidden` 且从不滚动）。

### 验证方式

没有测试基建（与仓库其它部分一致）。本视图是在真实浏览器里驱动一个临时 `apps/web`
页面验证的：三种布局、尺寸与列数、窗口化（5000 行只挂载可见行、滚动换窗）、瀑布流增量
分页、选择与删除写回、封面三种来源与降级、collection 节点预览封面、只读下隐藏删除、
以及控制台无异常。

第二轮重做后同一套驱动扩到 **31 项**，另外覆盖：标签薄涂（不同选项底色不同、纯文本值保持
中性）、瀑布流的行优先顺序与封面比例错落、列表宽/窄两种形态、键盘全集（方向键 / Home / End /
Shift+连选 / Space / Esc / Ctrl+A / Enter 打开）、Shift 点击连选、右键菜单条目、悬停浮现、
以及「只读时卡片菜单与批量操作都没有删除项」。

第四、五轮之后验证方式是同一套（临时页面 + 无头 Chromium/CDP），重点变成：卡片与看板同组件
（同一份 卡片配置、同一套标签/值行）、`卡片配置` 的角色赋值与眼睛回读、拖拽排序同时改列表与
卡片顺序、展示模式、新增字段落到卡片、工具条三个视图的布局与**没有高亮触发器**、卡片上
没有勾选框/「…」按钮（右键仍是完整菜单）、以及画廊右功能区只有「更多」。

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

| 依赖                                            | 用途                    |
| ----------------------------------------------- | ----------------------- |
| @workspace/ui（shadcn Card/Badge/Skeleton 等）  | 卡片与加载态            |
| @workspace/ui 现有 previews（image-preview 等） | collection 卡片封面复用 |
| react-virtuoso（可选）                          | 大卡片集虚拟滚动        |

---

## 3. 数据转换适配

### 3.1 rows → cards

```ts
// packages/dataview/src/views/gallery/gallery-schema.ts
export function rowsToCards(
  source: DataViewSource,
  config: GalleryViewConfig,
): GalleryCard[] {
  return source.rows.map((row) => ({
    id: row.id,
    title:
      CellResolver.displayText(
        row.cells[config.titleField],
        titleField,
        resolveNodeTitle,
      ) || "未命名",
    cover: resolveCover(row, source, config), // database: url/image 字段；collection: 节点预览
    badges: config.badgeFields.map((fid) => ({
      fid,
      text: CellResolver.displayText(row.cells[fid], field),
      color: CellResolver.toColor(row.cells[fid], field),
    })),
    meta: config.metaFields.map((fid) =>
      CellResolver.displayText(row.cells[fid], field),
    ),
  }));
}

function resolveCover(row, source, config) {
  if (source.kind === "collection")
    return { kind: "nodePreview", nodeId: source.nodeIds[idx] };
  const coverField = source.fields.find((f) => f.id === config.coverField);
  return {
    kind: "cell",
    cell: row.cells[config.coverField],
    field: coverField,
  };
}
```

- titleField 默认主列；coverField（database：url 类型，指向图片）；badgeFields（select/multiSelect，渲染成彩色标签）；metaFields（date/number 等次要信息）。
- collection：封面直接复用现有节点预览渲染器（image/video/text/webpage 等），不重复造卡片。

### 3.2 交互

- 点击卡片 → onOpenRecord（database 详情）/ onOpenNode（collection 打开节点）。
- 卡片可多选（长按/Ctrl），用于批量删除/导出。

---

## 4. 配置项（GalleryViewConfig）

```ts
export interface GalleryViewConfig {
  titleField: string; // 卡片标题（text，默认主列）
  coverField?: string; // 封面字段（url，可选）
  badgeFields?: string[]; // 彩色标签字段（select/multiSelect）
  metaFields?: string[]; // 次要信息字段（date/number 等）

  layout: "grid" | "masonry" | "list"; // 网格 / 瀑布流 / 列表
  cardSize: "small" | "medium" | "large";
  columns: number; // 网格列数（responsive 时可作上限）
  showEmptyCover: boolean; // 无封面时显示占位
  selectable: boolean; // 多选
  virtualized: boolean; // 大集虚拟滚动
}
```

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

| 操作     | 手势/入口      | 结果                      |
| -------- | -------------- | ------------------------- |
| 打开     | 点击卡片       | onOpenRecord / onOpenNode |
| 多选     | Ctrl/长按点击  | 批量模式                  |
| 切换布局 | 工具条布局切换 | grid/masonry/list         |
| 调整尺寸 | 工具条尺寸     | small/medium/large        |
| 批量操作 | 选中后工具条   | 删除/导出                 |

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

| #   | 任务                | 说明                             |
| --- | ------------------- | -------------------------------- |
| L1  | gallery-schema.ts   | rowsToCards / resolveCover       |
| L2  | 卡片组件            | 封面 + 标题 + 标签 + 元信息      |
| L3  | 布局                | grid/masonry/list                |
| L4  | collection 封面复用 | 现有 previews 缩略容器           |
| L5  | 多选 + 虚拟滚动     | useRowSelection + react-virtuoso |
