# Force Mode Architecture Audit

## 1. 架构全貌 + 数据管线

```mermaid
flowchart TB
    %% ══════════════════════════════════════════════════════
    %% LEGEND
    %% ══════════════════════════════════════════════════════
    subgraph LEGEND["📋 开发度图例"]
        direction LR
        L1["🟢 稳定"]
        L2["🟡 有缺口"]
        L3["🟠 部分损坏"]
        L4["🔴 严重/断裂"]
    end

    %% ══════════════════════════════════════════════════════
    %% PARENT: <Graph/> — data ownership layer
    %% ══════════════════════════════════════════════════════
    subgraph PARENT["📦 &lt;Graph/&gt; (graph.tsx) — 数据所有者"]
        direction TB
        STORE[("useDataStore<br/>🟢 稳定")]
        SNAPSHOT["getDataSnapshot()<br/>🟢 稳定"]
        DIFF["subscribeDiff()<br/>🟡 回调同步抛异常无保护"]
        FILTER["filter()<br/>🟢 稳定"]
    end

    %% ══════════════════════════════════════════════════════
    %% MAIN THREAD: ForceGraph orchestrator
    %% ══════════════════════════════════════════════════════
    subgraph MAIN["🖥️ ForceGraph.tsx — 主线程编排器"]
        direction TB
        BOOT{"boot effect<br/>🔴 canvas 双重 transfer 崩溃<br/>🔴 StrictMode 僵尸 Worker"}
        LISTENER["eventListener<br/>🟡 proxyEvent 浮动 Promise 未 catch"]
        VIEWPORT["viewportRef<br/>🔴 从不更新 → 缩放全死"]
        RESIZE["ResizeObserver<br/>🟡 setDimensions 静默吞错"]
        FRAMEHANDLER{"__FRAME__ handler<br/>🔴 ctx2d=null → 永不绘制"}
        CMENU["GraphContextMenu<br/>🟡 同步打开/异步关闭竞争"]
        PB["PreviewBlock<br/>🟢 正常"]
    end

    %% ══════════════════════════════════════════════════════
    %% EVENT HANDLER: shared surface
    %% ══════════════════════════════════════════════════════
    subgraph HANDLER["🔀 eventHandler.ts — 共享事件面"]
        direction LR
        HW["handleWorkerEvent()<br/>🟡 17/17 变体全覆盖<br/>🔴 4 个永不发射"]
        SEL["selection ops<br/>🟢 正常"]
        PREV["preview ops<br/>🟢 正常"]
        ALT["Alt+drag 边创建<br/>🟢 正常"]
    end

    %% ══════════════════════════════════════════════════════
    %% TRANSFORM: data bridge
    %% ══════════════════════════════════════════════════════
    subgraph TRANSFORM["🔧 force/transform.ts — 数据桥"]
        direction LR
        N2S["nodeDataToForceSeeds<br/>🟡 NaN 穿透类型守卫<br/>🟡 weight 从未读取"]
        E2S["edgeDataToForceSeeds<br/>🟢 正常"]
        D2P["diffToForcePayload<br/>🟢 正常"]
    end

    %% ══════════════════════════════════════════════════════
    %% CHANNELS: Worker boundary
    %% ══════════════════════════════════════════════════════
    subgraph CHANNEL["📡 Worker 通信边界"]
        direction LR
        READY["__READY__<br/>🟢 正常"]
        SETCANVAS["__SET_CANVAS__<br/>🔴 二次调用崩溃"]
        FRAME_CH["__FRAME__<br/>🔴 ImageBitmap 传输后<br/>主线程 ctx2d=null"]
        PING_CH["__PING__/__PONG__<br/>🟡 未使用"]
        RPC["Comlink RPC<br/>🟢 13/13 方法匹配"]
    end

    %% ══════════════════════════════════════════════════════
    %% WORKER: simulation + canvas
    %% ══════════════════════════════════════════════════════
    subgraph WORKER["⚙️ Worker (force.worker.ts + api.ts + simulation.ts + canvas.ts)"]
        direction TB
        
        subgraph API_L["api.ts"]
            INIT["initData / applyDiff<br/>🟡 createOrUpdate 不调 recomputeUiStates"]
            CONFIG["updateConfig / updateStyle<br/>🟡 collisionRadius:0 不可设"]
            FIX["setNodeFixed / setNodePosition<br/>🟡 多选拖拽坍缩到同一点"]
        end
        
        subgraph SIM["simulation.ts"]
            HITTEST["hitTest<br/>🟡 NaN 可坏四叉树<br/>🟡 严格等距节点两模式不一致"]
            STATES["recomputeUiStates<br/>🔴 边从不更新<br/>🔴 active/disabled 永远不赋值<br/>🟡 edge 选中死代码"]
            DRAG["drag 逻辑<br/>🔴 pointer-down 选态不同步 UI store<br/>🔴 pointer-up 无条件 emit canvas:click 清空选态"]
            NEIGHBOR["recomputeNeighbors<br/>🟢 1度邻居正确"]
        end
        
        subgraph CANVAS_L["canvas.ts"]
            RENDER["renderFrame<br/>🔴 transferToImageBitmap 每帧清空缓冲区<br/>🔴 arrow 画在节点中心被覆盖<br/>🟡 7态仅 6 种视觉"]
            SELFLOOP["自环边<br/>🔴 退化为点/直线"]
            VIEWPORT_T["viewport transform<br/>🟢 与主线程 screenToSimulation 一致<br/>🟡 线宽/阴影随缩放变化"]
        end
    end

    %% ══════════════════════════════════════════════════════
    %% FLOWS
    %% ══════════════════════════════════════════════════════
    
    %% Snapshot flow (green path)
    STORE -->|"nodes/edges Map"| SNAPSHOT
    SNAPSHOT -->|"GraphSnapshot"| FILTER
    FILTER -->|"filtered"| N2S
    N2S -->|"ForceSeed[]"| INIT
    INIT -->|"new Worker"| READY
    READY -->|"boot ok"| SETCANVAS
    SETCANVAS -->|"OffscreenCanvas"| RENDER
    RENDER -->|"ImageBitmap"| FRAME_CH
    FRAME_CH -->|"raw postMessage"| FRAMEHANDLER

    %% Diff flow (yellow path)
    STORE -->|".subscribe()"| DIFF
    DIFF -->|"SourceDiff"| D2P
    D2P -->|"ForceDiffPayload"| INIT
    INIT -->|"sim.nodes()"| SIM

    %% Event flow (orange path)
    LISTENER -->|"ProxiedDomEvent"| RPC
    RPC -->|"api.proxyEvent()"| HITTEST
    HITTEST -->|"hit target"| DRAG
    HITTEST -->|"hover change"| STATES
    DRAG -->|"emit()"| RPC
    RPC -->|"Comlink.proxy"| HW

    %% Viewport flow (red path - dead)
    VIEWPORT -.->|"❌ 从不更新"| RPC

    %% Styles
    classDef green fill:#4ade80,stroke:#16a34a,color:#052e16,stroke-width:1px
    classDef yellow fill:#fef08a,stroke:#ca8a04,color:#422006,stroke-width:1px
    classDef orange fill:#fed7aa,stroke:#c2410c,color:#431407,stroke-width:1px
    classDef red fill:#fecaca,stroke:#dc2626,color:#450a0a,stroke-width:1px

    class STORE,SNAPSHOT,FILTER,N2S,E2S,D2P,READY,RPC,PB,INIT,CONFIG,NEIGHBOR,VIEWPORT_T,SEL,PREV,ALT green
    class DIFF,LISTENER,RESIZE,CMENU,HW,PING_CH,HITTEST,FIX yellow
    class FG,BOOT,DRAG orange
    class FRAMEHANDLER,SETCANVAS,FRAME_CH,VIEWPORT,RENDER,STATES,SELFLOOP red
```

---

## 2. Worker 内部渲染管线 + 状态机

```mermaid
flowchart TB
    %% ══════════════════════════════════════════════════════
    %% TICK LOOP: simulation → frame
    %% ══════════════════════════════════════════════════════
    subgraph TICK["⏱️ 每 Tick 渲染循环"]
        direction LR
        ONTICK["d3 onTick<br/>🟢 正常触发"]
        COALESCE["queueMicrotask<br/>合帧<br/>🟢 正常"]
        SCHEDULE["scheduleFrame<br/>🟢 正常"]
    end

    subgraph RENDER_PIPE["🎨 渲染管线"]
        direction TB
        
        BG["1. 背景填充<br/>🟢 正常"]
        GRID["2. 网格线<br/>🟡 gridColor 定义但未绘制"]
        EDGES["3. 画边<br/>🔴 边永远 default 风格<br/>🔴 箭头被节点遮挡<br/>🔴 自环退化为点"]
        NODES["4. 画节点<br/>🟡 7态仅 6 种视觉<br/>🟡 fill 字段从未使用<br/>🟡 label 色不随状态变"]
        TRANSFER["5. transferToImageBitmap()<br/>🔴 每帧清空 OffscreenCanvas<br/>🔴 主线程 ctx2d=null 无法绘制"]
    end

    TICK --> RENDER_PIPE

    %% ══════════════════════════════════════════════════════
    %% UiState 7-state machine
    %% ══════════════════════════════════════════════════════
    subgraph STATE_MACHINE["🧠 UiState 7 态机 (force 独有)"]
        direction LR

        subgraph REACHABLE["✅ 可到达的态"]
            DEFAULt["default<br/>🟢 初始/无选态"]
            HOVER["hover<br/>🟢 悬停"]
            SELECTED["selected<br/>🟡 左键选中断裂<br/>仅右键可达"]
            NEIGHBOR_A["neighborActive<br/>🟢 1度邻居"]
            INACTIVE["inactive<br/>🟡 可达但视觉弱"]
        end

        subgraph DEAD["❌ 死态 (从未赋值)"]
            ACTIVE["active<br/>🔴 与 selected 视觉相同<br/>从未有代码赋值"]
            DISABLED["disabled<br/>🔴 从未有代码赋值"]
        end
    end

    %% ══════════════════════════════════════════════════════
    %% Edge rendering detail
    %% ══════════════════════════════════════════════════════
    subgraph EDGE_DETAIL["🔗 边渲染详情"]
        direction TB
        HIER["hierarchy → 直线<br/>🟢 正常"]
        FLOW_E["flow → 二次贝塞尔<br/>🟢 正常"]
        ASSOC["association → 虚线 6 4<br/>🟢 正常"]
        INTER["interaction → cubic bezier<br/>🟢 正常"]
        BI_E["双向边 → simplebezier + 双箭头<br/>🟡 箭头在节点中心被覆盖"]
        ARROW["drawArrow()<br/>🟡 forward/reverse 方向正确<br/>🔴 画在 (tx,ty) 被节点覆盖"]
        SELFL["自环 source===target<br/>🔴 bezierCurveTo 全等控制点 → 退化为点<br/>🔴 quadratic → 退化直线"]
    end

    %% ══════════════════════════════════════════════════════
    %% Hit-test detail
    %% ══════════════════════════════════════════════════════
    subgraph HIT_DETAIL["🎯 Hit-Test 详情"]
        direction TB
        BRUTE["nodes &lt; 2000: 暴力遍历<br/>🟢 正常"]
        QT["nodes ≥ 2000: d3-quadtree<br/>🟡 严格等距时与暴力结果不同<br/>🟡 NaN 坐标可损坏四叉树"]
        NAN["NaN 坐标<br/>🟡 typeof NaN === 'number' →<br/>穿透 getPositionForView 守卫<br/>🟡 dist=NaN → 永不命中"]
    end

    %% ══════════════════════════════════════════════════════
    %% D3-force config
    %% ══════════════════════════════════════════════════════
    subgraph D3_CONFIG["⚡ d3-force 配置"]
        direction LR
        CFG_BOX["DEFAULT_FORCE_CONFIG<br/>🟡 缺 centerX/centerY<br/>🟡 collisionRadius:0 不可设"]
        ALPHA_BOX["Alpha 控制<br/>🟢 createOrUpdate: alpha(1)<br/>🟢 applyDiff: alphaTarget(0.1)<br/>🟢 updateConfig: alpha(0.3)<br/>🟢 setNodeFixed: alphaTarget(0.3)"]
    end

    %% Styles
    classDef green fill:#4ade80,stroke:#16a34a,color:#052e16,stroke-width:1px
    classDef yellow fill:#fef08a,stroke:#ca8a04,color:#422006,stroke-width:1px
    classDef red fill:#fecaca,stroke:#dc2626,color:#450a0a,stroke-width:1px

    class ONTICK,COALESCE,SCHEDULE,BG,DEFAULt,HOVER,NEIGHBOR_A,HIER,FLOW_E,ASSOC,INTER,BRUTE,ALPHA_BOX green
    class GRID,SELECTED,INACTIVE,BI_E,ARROW,QT,NAN,CFG_BOX yellow
    class EDGES,NODES,TRANSFER,ACTIVE,DISABLED,SELFL red
```

---

## 3. 开发度记分卡

| 模块 | 文件 | 合同 | 功能 | 鲁棒性 | 信号 |
|---|---|---|---|---|---|
| **数据供给** | `graph.tsx` | 🟢 | 🟢 | 🟡 | diff 回调同步抛异常无保护 |
| **编排器** | `ForceGraph.tsx` | — | 🟠 | 🔴 | canvas 双重 transfer 崩溃、僵尸 Worker、订阅泄漏 |
| **事件桥** | `eventHandler.ts` | 🟢 | 🟡 | 🟢 | 17/17 事件全覆盖，4个永不发射 |
| **转换层** | `transform.ts` | 🟢 | 🟡 | 🟡 | NaN 穿透、weight 死代码、semanticColor 死特性 |
| **DOM 事件** | `eventListener.ts` | 🟢 | 🟡 | 🟡 | proxyEvent 浮动 Promise |
| **Worker API** | `api.ts` | 🟢 | 🟢 | 🟡 | createOrUpdate 不调 recomputeUiStates |
| **模拟** | `simulation.ts` | 🟢 | 🟠 | 🟡 | 选态断裂、多选拖拽坍缩、hitTest NaN/四叉树分歧 |
| **画布** | `canvas.ts` | 🔴 | 🔴 | 🟡 | ctx2d=null 管线断裂、箭头隐藏、自环退化 |
| **主题** | `styleConfig.ts` | 🟡 | 🟡 | 🟢 | DEFAULT_FORCE_CONFIG 缺 centerX/Y、active/selected 相同 |

### 问题统计

| 等级 | 数量 | 关键问题 |
|---|---|---|
| 🔴 危急 | 4 | Canvas 渲染管线断裂、视图切换崩溃、StrictMode 僵尸 Worker、Diff 订阅泄漏 |
| 🔴 高 | 12 | 缩放死掉、选态断裂、4事件不发射、7态仅6视觉、边永远default、箭头隐藏、多选拖拽坍缩… |
| 🟡 中 | 9 | proxyEvent Promise 泄漏、NaN 穿透、collisionRadius:0 短路、canvas-init 静默失败… |
| 🟢 低 | 5 | boot timer 泄漏、bitmap 泄漏、无 ErrorBoundary、healthCheck 死代码… |

> **总评：Force 模式处于重度开发阶段，不可用于生产。** Canvas 渲染管线和选态系统是最优先修复项。
