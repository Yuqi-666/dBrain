import PocketBase from "pocketbase";

export interface PocketbaseClientConfig {
  url: string;
}

let instance: PocketBase | null = null;

export const createPocketbaseClient = (config: PocketbaseClientConfig): PocketBase => {
  if (!instance) {
    instance = new PocketBase(config.url);
  }
  return instance;
};

export const getPocketbaseClient = (): PocketBase => {
  if (!instance) {
    throw new Error(
      "PocketbaseClient not initialized. Call createPocketbaseClient first.",
    );
  }
  return instance;
};

export const resetPocketbaseClient = (): void => {
  instance = null;
};
