# 全链路 sourceId 追踪方案

## TL;DR

> **Quick Summary**: 在前端生成 sourceId (ULID) 作为客户端唯一标识，通过 WebSocket connectionParams 传到后端，后端注入到 DomainEvent metadata，前端订阅时过滤自己发出的事件防止重复修改。
>
> **Deliverables**:
> - sourceId 生成和存储机制 (Zustand store)
> - 后端 EventMetadata 添加 sourceId
> - 后端 Context 传递 sourceId
> - 4 个 command services 注入 sourceId 到事件
> - 前端订阅过滤 sourceId
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Wave 1 → Wave 2 → Wave 3

---

## Context

### Original Request
全链路添加 sourceId，前端生成和储存 sourceId，在发送 mutation 请求时传入 sourceId，并且后端全链路携带 sourceId，domain 事件也要携带 sourceId，当发送事件时前端根据事件中的 sourceId 来决定要不要应用更改，防止同一前端重复修改。

### Interview Summary
**Key Discussions**:
- sourceId 是客户端唯一标识，每个标签页独立生成
- 不需要为每个请求生成不同标识，sourceId 在标签页生命周期内保持一致
- 多标签页行为：各自独立，不互相过滤
- 重复定义：同一 sourceId 的所有事件都过滤

**Design Decisions**:
- sourceId 生成: ULID (时间有序，URL 安全)
- sourceId 存储: Zustand store (内存，页面刷新丢失)
- 防止重复: 基于 sourceId 过滤

### Research Findings
- `packages/interfaces/src/api/event.ts` 中已有 `sourceId` 字段
- 后端 `EventMetadata` 只有 `occurredAt`, `eventVersion`, `userId` — **没有 sourceId**
- 前端订阅过滤在 `subscriptions.ts` 只按 `userId` 过滤
- 4 个 command services 共 17 个 `eventBus.publish()` 调用

---

## Work Objectives

### Core Objective
实现全链路 sourceId 追踪，防止同一前端实例重复修改。

### Concrete Deliverables
- `packages/store/src/sourceIdStore.ts` - sourceId 生成和存储
- `packages/api-client/src/trpc/client.ts` - 传递 sourceId via connectionParams
- `backend/domain/src/event-bus/types.ts` - EventMetadata 添加 sourceId
- `backend/adapter-front/src/trpc/server.ts` - Context 添加 sourceId
- 4 个 command services - 注入 sourceId 到事件 metadata
- `packages/api-client/src/trpc/subscriptions.ts` - 按 sourceId 过滤

### Definition of Done
- [ ] 所有 mutation 请求携带 sourceId
- [ ] DomainEvent.metadata.sourceId 被正确填充
- [ ] 前端订阅过滤自己发出的事件

### Must Have
- sourceId 在前端生成并存储在 Zustand store
- mutation 请求通过 connectionParams 传递 sourceId
- 后端从 context 提取 sourceId 注入事件
- 前端订阅时过滤 sourceId 与自己相同的事件

### Must NOT Have (Guardrails)
- ❌ 不能添加任何 UI 指示器显示 "duplicate prevention active"
- ❌ 不能添加服务端 sourceId 持久化存储
- ❌ 不能持久化 sourceId 到 localStorage/cookies
- ❌ 不能修改 tRPC 公共 API 签名
- ❌ 不能修改现有事件的数据库结构

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None (无测试基础设施)
- **Agent-Executed QA**: 每任务包含 QA scenarios

### QA Policy
Every task includes agent-executed QA scenarios:
- 前端: Bash/curl 验证 API 行为
- 后端: TypeScript 类型检查 + 手动验证

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - 可并行):
├── T1: 添加 ULID 依赖
├── T2: 添加 sourceId 到 EventMetadata 类型
├── T3: 添加 sourceId 到 tRPC Context
└── T4: Zustand store 生成和存储 sourceId

Wave 2 (Backend - 可并行):
├── T5: node-command.service 注入 sourceId
├── T6: edge-command.service 注入 sourceId
├── T7: view-command.service 注入 sourceId
└── T8: semantic-command.service 注入 sourceId

Wave 3 (Integration):
├── T9: trpc client getConnectionParams 传递 sourceId
└── T10: 前端订阅过滤 sourceId
```

### Dependency Matrix

| Task | Blocks | Blocked By |
|------|--------|------------|
| T1 | T2 | - |
| T2 | T5-T8 | T1 |
| T3 | T5-T8 | T1 |
| T4 | T9 | T1 |
| T5-T8 | - | T2, T3 |
| T9 | - | T4 |
| T10 | - | T5-T8, T9 |

### Agent Dispatch Summary

- **Wave 1**: **4 tasks** parallel → `quick`
- **Wave 2**: **4 tasks** parallel → `quick`
- **Wave 3**: **2 tasks** sequential → `quick`

---

## TODOs

- [ ] T1: 添加 ULID 依赖

  **What to do**:
  - 在 `packages/store/package.json` 添加 `ulid` 依赖
  - 在 `backend/domain/package.json` 添加 `ulid` 依赖
  - 运行 `pnpm install`

  **Must NOT do**:
  - 不要在其他包添加 ulid

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T2, T3, T4)
  - **Blocks**: T2, T3
  - **Blocked By**: None

  **References**:
  - `packages/store/package.json` - 添加依赖的目标位置
  - `backend/domain/package.json` - 添加依赖的目标位置

  **Acceptance Criteria**:
  - [ ] `pnpm install` 成功完成
  - [ ] `ulid` 可在 `packages/store` 中 import
  - [ ] `ulid` 可在 `backend/domain` 中 import

  **QA Scenarios**:

  \`\`\`
  Scenario: ULID import verification
    Tool: Bash
    Preconditions: pnpm install completed
    Steps:
      1. cd packages/store && node -e "require('ulid')" && echo "OK"
      2. cd backend/domain && node -e "require('ulid')" && echo "OK"
    Expected Result: Both print "OK" without errors
    Evidence: .sisyphus/evidence/task-1-ulid-import.{ext}
  \`\`\`

  **Commit**: YES
  - Message: `feat(source-id): add ulid dependency`
  - Files: `packages/store/package.json`, `backend/domain/package.json`

- [ ] T2: 添加 sourceId 到 EventMetadata 类型

  **What to do**:
  - 修改 `backend/domain/src/event-bus/types.ts` 添加 `sourceId: string` 到 `EventMetadata` 接口
  - 确保向后兼容（可选字段）

  **Must NOT do**:
  - 不要修改任何事件的使用方式
  - 不要添加必填验证

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T3, T4)
  - **Blocks**: T5, T6, T7, T8
  - **Blocked By**: T1

  **References**:
  - `backend/domain/src/event-bus/types.ts` - EventMetadata 定义位置
  - `packages/interfaces/src/api/event.ts` - 前端已有 sourceId 类型定义

  **Acceptance Criteria**:
  - [ ] `EventMetadata` 接口包含 `sourceId?: string`
  - [ ] `cd backend/domain && pnpm typecheck` 通过

  **QA Scenarios**:

  \`\`\`
  Scenario: EventMetadata type check
    Tool: Bash
    Preconditions: None
    Steps:
      1. cd backend/domain && pnpm typecheck
    Expected Result: 0 errors
    Evidence: .sisyphus/evidence/task-2-event-metadata-typecheck.{ext}
  \`\`\`

  **Commit**: YES
  - Message: `feat(source-id): add sourceId to EventMetadata`
  - Files: `backend/domain/src/event-bus/types.ts`

- [ ] T3: 添加 sourceId 到 tRPC Context

  **What to do**:
  - 修改 `backend/adapter-front/src/trpc/server.ts` 的 `Context` 接口，添加 `sourceId: string`
  - 修改 `createContext()` 从 `connectionParams` 提取 `sourceId`

  **Must NOT do**:
  - 不要修改任何 procedure 的签名
  - 不要添加新的 middleware

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T2, T4)
  - **Blocks**: T5, T6, T7, T8
  - **Blocked By**: T1

  **References**:
  - `backend/adapter-front/src/trpc/server.ts` - Context 定义和 createContext 函数
  - `backend/adapter-front/src/trpc/ws-server.ts` - WebSocket context 创建
  - `packages/api-client/src/trpc/client.ts` - connectionParams 传递方式

  **Acceptance Criteria**:
  - [ ] `Context` 接口包含 `sourceId: string`
  - [ ] `createContext()` 从 `connectionParams.sourceId` 提取值
  - [ ] `cd backend/adapter-front && pnpm typecheck` 通过

  **QA Scenarios**:

  \`\`\`
  Scenario: Context type check
    Tool: Bash
    Preconditions: None
    Steps:
      1. cd backend/adapter-front && pnpm typecheck
    Expected Result: 0 errors
    Evidence: .sisyphus/evidence/task-3-context-typecheck.{ext}
  \`\`\`

  **Commit**: YES
  - Message: `feat(source-id): add sourceId to tRPC context`
  - Files: `backend/adapter-front/src/trpc/server.ts`

- [ ] T4: Zustand store 生成和存储 sourceId

  **What to do**:
  - 创建 `packages/store/src/sourceIdStore.ts`
  - 使用 `ulid()` 生成 sourceId
  - 导出 `useSourceIdStore` hook

  **Must NOT do**:
  - 不要持久化到 localStorage/sessionStorage
  - 不要与其他标签页共享

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with T1, T2, T3)
  - **Blocks**: T9
  - **Blocked By**: T1

  **References**:
  - `packages/store/src/authStore.ts` - 现有 store 模式参考
  - `packages/store/src/graphStore.ts` - Zustand store 写法

  **Acceptance Criteria**:
  - [ ] `useSourceIdStore` 提供 `getSourceId()` 方法
  - [ ] sourceId 在 store 初始化时生成（ulid）
  - [ ] `cd packages/store && pnpm typecheck` 通过

  **QA Scenarios**:

  \`\`\`
  Scenario: sourceIdStore functionality
    Tool: Bash
    Preconditions: None (pure TS, no runtime)
    Steps:
      1. cd packages/store && pnpm typecheck
    Expected Result: 0 errors
    Evidence: .sisyphus/evidence/task-4-store-typecheck.{ext}
  \`\`\`

  **Commit**: YES
  - Message: `feat(source-id): add sourceId store`
  - Files: `packages/store/src/sourceIdStore.ts`

- [ ] T5: node-command.service 注入 sourceId

  **What to do**:
  - 修改 `backend/application/src/commands/node/node-command.service.ts`
  - 在 4 个 `eventBus.publish()` 调用中，将 `sourceId` 添加到 metadata

  **Must NOT do**:
  - 不要修改事件的数据结构
  - 不要修改其他逻辑

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T6, T7, T8)
  - **Blocks**: T10
  - **Blocked By**: T2, T3

  **References**:
  - `backend/application/src/commands/node/node-command.service.ts` - 4 个 publish 位置 (lines 261, 312, 372, 388)
  - `backend/domain/src/event-bus/types.ts` - EventMetadata 结构

  **Acceptance Criteria**:
  - [ ] 4 个 eventBus.publish() 都包含 `sourceId` in metadata
  - [ ] `cd backend/application && pnpm typecheck` 通过

  **QA Scenarios**:

  \`\`\`
  Scenario: node-command.service type check
    Tool: Bash
    Preconditions: None
    Steps:
      1. cd backend/application && pnpm typecheck
    Expected Result: 0 errors
    Evidence: .sisyphus/evidence/task-5-node-command-typecheck.{ext}
  \`\`\`

  **Commit**: YES
  - Message: `feat(source-id): inject sourceId in node-command events`
  - Files: `backend/application/src/commands/node/node-command.service.ts`

- [ ] T6: edge-command.service 注入 sourceId

  **What to do**:
  - 修改 `backend/application/src/commands/edge/edge-command.service.ts`
  - 在 3 个 `eventBus.publish()` 调用中，将 `sourceId` 添加到 metadata

  **Must NOT do**:
  - 不要修改事件的数据结构

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T5, T7, T8)
  - **Blocks**: T10
  - **Blocked By**: T2, T3

  **References**:
  - `backend/application/src/commands/edge/edge-command.service.ts` - 3 个 publish 位置 (lines 74, 131, 152)

  **Acceptance Criteria**:
  - [ ] 3 个 eventBus.publish() 都包含 `sourceId` in metadata
  - [ ] `cd backend/application && pnpm typecheck` 通过

  **QA Scenarios**:

  \`\`\`
  Scenario: edge-command.service type check
    Tool: Bash
    Preconditions: None
    Steps:
      1. cd backend/application && pnpm typecheck
    Expected Result: 0 errors
    Evidence: .sisyphus/evidence/task-6-edge-command-typecheck.{ext}
  \`\`\`

  **Commit**: YES
  - Message: `feat(source-id): inject sourceId in edge-command events`
  - Files: `backend/application/src/commands/edge/edge-command.service.ts`

- [ ] T7: view-command.service 注入 sourceId

  **What to do**:
  - 修改 `backend/application/src/commands/view/view-command.service.ts`
  - 在 3 个 `eventBus.publish()` 调用中，将 `sourceId` 添加到 metadata

  **Must NOT do**:
  - 不要修改事件的数据结构

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T5, T6, T8)
  - **Blocks**: T10
  - **Blocked By**: T2, T3

  **References**:
  - `backend/application/src/commands/view/view-command.service.ts` - 3 个 publish 位置 (lines 73, 130, 151)

  **Acceptance Criteria**:
  - [ ] 3 个 eventBus.publish() 都包含 `sourceId` in metadata
  - [ ] `cd backend/application && pnpm typecheck` 通过

  **QA Scenarios**:

  \`\`\`
  Scenario: view-command.service type check
    Tool: Bash
    Preconditions: None
    Steps:
      1. cd backend/application && pnpm typecheck
    Expected Result: 0 errors
    Evidence: .sisyphus/evidence/task-7-view-command-typecheck.{ext}
  \`\`\`

  **Commit**: YES
  - Message: `feat(source-id): inject sourceId in view-command events`
  - Files: `backend/application/src/commands/view/view-command.service.ts`

- [ ] T8: semantic-command.service 注入 sourceId

  **What to do**:
  - 修改 `backend/application/src/commands/semantic/semantic-command.service.ts`
  - 在 7 个 `eventBus.publish()` 调用中，将 `sourceId` 添加到 metadata

  **Must NOT do**:
  - 不要修改事件的数据结构

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with T5, T6, T7)
  - **Blocks**: T10
  - **Blocked By**: T2, T3

  **References**:
  - `backend/application/src/commands/semantic/semantic-command.service.ts` - 7 个 publish 位置 (lines 101, 137, 172, 208, 239, 271, 291)

  **Acceptance Criteria**:
  - [ ] 7 个 eventBus.publish() 都包含 `sourceId` in metadata
  - [ ] `cd backend/application && pnpm typecheck` 通过

  **QA Scenarios**:

  \`\`\`
  Scenario: semantic-command.service type check
    Tool: Bash
    Preconditions: None
    Steps:
      1. cd backend/application && pnpm typecheck
    Expected Result: 0 errors
    Evidence: .sisyphus/evidence/task-8-semantic-command-typecheck.{ext}
  \`\`\`

  **Commit**: YES
  - Message: `feat(source-id): inject sourceId in semantic-command events`
  - Files: `backend/application/src/commands/semantic/semantic-command.service.ts`

- [ ] T9: trpc client getConnectionParams 传递 sourceId

  **What to do**:
  - 修改 `packages/api-client/src/trpc/client.ts`
  - 在 `getConnectionParams()` 返回值中添加 `sourceId`

  **Must NOT do**:
  - 不要修改 WebSocket 连接逻辑

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Sequential**: After T4
  - **Blocks**: T10
  - **Blocked By**: T4

  **References**:
  - `packages/api-client/src/trpc/client.ts` - getConnectionParams 函数
  - `packages/store/src/sourceIdStore.ts` - sourceIdStore 位置

  **Acceptance Criteria**:
  - [ ] `getConnectionParams()` 返回对象包含 `sourceId`
  - [ ] `cd packages/api-client && pnpm typecheck` 通过

  **QA Scenarios**:

  \`\`\`
  Scenario: API client type check
    Tool: Bash
    Preconditions: None
    Steps:
      1. cd packages/api-client && pnpm typecheck
    Expected Result: 0 errors
    Evidence: .sisyphus/evidence/task-9-api-client-typecheck.{ext}
  \`\`\`

  **Commit**: YES
  - Message: `feat(source-id): pass sourceId in connectionParams`
  - Files: `packages/api-client/src/trpc/client.ts`

- [ ] T10: 前端订阅过滤 sourceId

  **What to do**:
  - 修改 `packages/api-client/src/trpc/subscriptions.ts`
  - 在事件处理回调中添加 sourceId 过滤逻辑
  - 如果 `event.metadata.sourceId === mySourceId` 则跳过

  **Must NOT do**:
  - 不要修改事件处理逻辑（只做过滤）

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Sequential**: After T9
  - **Blocks**: None
  - **Blocked By**: T5, T6, T7, T8, T9

  **References**:
  - `packages/api-client/src/trpc/subscriptions.ts` - 事件订阅逻辑 (lines 27-31 是当前过滤逻辑)
  - `packages/store/src/sourceIdStore.ts` - sourceIdStore 位置

  **Acceptance Criteria**:
  - [ ] 过滤条件包含 `event.metadata.sourceId === mySourceId`
  - [ ] 向后兼容：如果 `sourceId` 为 undefined 则不过滤
  - [ ] `cd packages/api-client && pnpm typecheck` 通过

  **QA Scenarios**:

  \`\`\`
  Scenario: Subscription filter type check
    Tool: Bash
    Preconditions: None
    Steps:
      1. cd packages/api-client && pnpm typecheck
    Expected Result: 0 errors
    Evidence: .sisyphus/evidence/task-10-subscription-typecheck.{ext}
  \`\`\`

  **Commit**: YES
  - Message: `feat(source-id): filter events by sourceId in subscription`
  - Files: `packages/api-client/src/trpc/subscriptions.ts`

---

## Final Verification Wave

- [ ] F1: **Plan Compliance Audit** — `oracle`

  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search for forbidden patterns. Check evidence files exist.

  Output: `Must Have [5/5] | Must NOT Have [5/5] | VERDICT: APPROVE/REJECT`

- [ ] F2: **Type Check Audit** — `unspecified-high`

  Run typecheck on all modified packages:
  - `cd packages/store && pnpm typecheck`
  - `cd packages/api-client && pnpm typecheck`
  - `cd backend/domain && pnpm typecheck`
  - `cd backend/application && pnpm typecheck`
  - `cd backend/adapter-front && pnpm typecheck`

  Output: `Store [PASS/FAIL] | API-Client [PASS/FAIL] | Domain [PASS/FAIL] | Application [PASS/FAIL] | Adapter-Front [PASS/FAIL] | VERDICT`

- [ ] F3: **Code Review** — `unspecified-high`

  Review all changed files for:
  - `as any` / `@ts-ignore`
  - 空 catch 块
  - console.log in prod
  - 重复代码 (4 个 command services 应该有共享模式)

  Output: `Files [N clean/N issues] | VERDICT`

---

## Commit Strategy

- **1**: `feat(source-id): add sourceId tracking across full stack` — 10 files

---

## Success Criteria

### Verification Commands
```bash
cd packages/store && pnpm typecheck
cd packages/api-client && pnpm typecheck
cd backend/domain && pnpm typecheck
cd backend/application && pnpm typecheck
cd backend/adapter-front && pnpm typecheck
```

### Final Checklist
- [ ] sourceId 在前端生成并存储在 Zustand store
- [ ] mutation 请求通过 connectionParams 传递 sourceId
- [ ] 后端 Context 包含 sourceId
- [ ] 4 个 command services 注入了 sourceId 到事件
- [ ] 前端订阅时过滤 sourceId 与自己相同的事件
- [ ] 所有类型检查通过
