import { io, type Socket, type SocketOptions } from "socket.io-client";
import type { ClientMessage, ApiAck } from "@workspace/interfaces";

export class SocketClient {
  private static instance: SocketClient | null = null;
  private socket: Socket | null = null;
  private readonly ackHandlers = new Map<
    string,
    (ack: ApiAck & { data?: any }) => void
  >();
  private readonly pushHandlers = new Map<string, Set<(data: any) => void>>();
  private readonly DEFAULT_TIMEOUT = 10000;

  private constructor() {}

  public static getInstance(): SocketClient {
    if (!SocketClient.instance) {
      SocketClient.instance = new SocketClient();
    }
    return SocketClient.instance;
  }

  public connect(url: string, options?: SocketOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.socket = io(url, options);

      this.socket.on("connect", () => {
        resolve();
      });

      this.socket.on("connect_error", (error: Error) => {
        reject(error);
      });

      this.socket.on("disconnect", () => {
        this.ackHandlers.forEach((handler) => {
          handler({
            success: false,
            error: { code: "DISCONNECTED", message: "Connection disconnected" },
            data: undefined,
          });
        });
        this.ackHandlers.clear();
      });

      this.socket.on(
        "ack",
        (ack: ApiAck & { requestId: string; data?: any }) => {
          const handler = this.ackHandlers.get(ack.requestId);
          if (handler) {
            handler(ack);
            this.ackHandlers.delete(ack.requestId);
          }
        },
      );

      this.socket.onAny((event: string, data: any) => {
        const handlers = this.pushHandlers.get(event);
        if (handlers) {
          handlers.forEach((handler) => handler(data));
        }
      });
    });
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.ackHandlers.clear();
    this.pushHandlers.clear();
  }

  public emitWithAck<T>(
    event: string,
    data: ClientMessage,
    timeout?: number,
  ): Promise<ApiAck & { data: T }> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error("Socket not connected"));
        return;
      }

      const requestId = crypto.randomUUID();
      const dataWithId = { ...data, requestId };
      const timeoutMs = timeout ?? this.DEFAULT_TIMEOUT;

      const timeoutId = setTimeout(() => {
        this.ackHandlers.delete(requestId);
        reject(new Error(`Request timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.ackHandlers.set(requestId, (ack) => {
        clearTimeout(timeoutId);
        resolve(ack as ApiAck & { data: T });
      });

      this.socket.emit(event, dataWithId);
    });
  }

  public on<T>(event: string, handler: (data: T) => void): void {
    if (!this.pushHandlers.has(event)) {
      this.pushHandlers.set(event, new Set());
    }
    this.pushHandlers.get(event)!.add(handler);
  }

  public off(event: string): void {
    this.pushHandlers.delete(event);
  }

  public get connected(): boolean {
    return this.socket?.connected ?? false;
  }
}
