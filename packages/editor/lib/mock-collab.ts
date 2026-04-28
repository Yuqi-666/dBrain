import type { Doc as YDoc } from "yjs"

class MockAwareness {
  private states: Map<number, Map<string, unknown>> = new Map()
  private localClientId: number = Math.floor(Math.random() * 1000000)
  private localState: Map<string, unknown> = new Map()
  private eventListeners: Map<string, Set<Function>> = new Map()

  getStates(): Map<number, Map<string, unknown>> {
    return this.states
  }

  setLocalStateField(field: string, value: unknown): void {
    this.localState.set(field, value)
    this.states.set(this.localClientId, new Map(this.localState))
  }

  getLocalState(): Map<string, unknown> | null {
    return this.localState
  }

  getLocalClientId(): number {
    return this.localClientId
  }

  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(callback)
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(callback)
    }
  }

  private emit(event: string, data: unknown): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach((cb) => cb(data))
    }
  }
}

export class MockCollabProvider {
  document: YDoc
  awareness: MockAwareness
  private eventListeners: Map<string, Set<Function>> = new Map()
  private _connected: boolean = false

  get connected(): boolean {
    return this._connected
  }

  constructor({ name, document }: { name: string; document: YDoc }) {
    this.document = document
    this.awareness = new MockAwareness()
    void name
  }

  connect(): void {
    if (this._connected) return
    this._connected = true
    queueMicrotask(() => {
      this.emit("connection", { status: "connected" })
    })
    queueMicrotask(() => {
      this.emit("synced", { document: this.document })
    })
  }

  disconnect(): void {
    if (!this._connected) return
    this._connected = false
    this.emit("disconnection", { status: "disconnected" })
  }

  destroy(): void {
    this.disconnect()
    this.eventListeners.clear()
  }

  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(callback)
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(callback)
    }
  }

  private emit(event: string, data: unknown): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data)
        } catch (e) {
          console.error(`Error in event listener for '${event}':`, e)
        }
      })
    }
  }
}