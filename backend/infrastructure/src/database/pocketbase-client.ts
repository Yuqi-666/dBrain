import PocketBase, { ClientResponseError } from 'pocketbase';

export interface PocketBaseClientConfig {
  url: string;
}

export class PocketBaseClient {
  private pb: PocketBase;
  private base: string;

  constructor(config: PocketBaseClientConfig) {
    this.base = config.url;
    this.pb = new PocketBase(config.url);
  }

  get baseUrl(): string {
    return this.base;
  }

  get client(): PocketBase {
    return this.pb;
  }

  get authStore() {
    return this.pb.authStore;
  }

  collection<T = Record<string, unknown>>(name: string) {
    return this.pb.collection<T>(name);
  }

  isClientResponseError(error: unknown): error is ClientResponseError {
    return error instanceof ClientResponseError;
  }

  cancelAllRequests(): void {
    this.pb.cancelAllRequests();
  }

  buildUrl(path: string): string {
    return this.pb.buildUrl(path);
  }
}

let instance: PocketBaseClient | null = null;

export const createPocketBaseClient = (config: PocketBaseClientConfig): PocketBaseClient => {
  if (!instance) {
    instance = new PocketBaseClient(config);
  }
  return instance;
};

export const getPocketBaseClient = (): PocketBaseClient => {
  if (!instance) {
    throw new Error('PocketBaseClient not initialized. Call createPocketBaseClient first.');
  }
  return instance;
};

export const resetPocketBaseClient = (): void => {
  instance = null;
};