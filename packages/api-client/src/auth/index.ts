import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { trpc } from "../trpc/provider";
import type { AuthUser } from "@workspace/interfaces/models/user";

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  nickname: string;
}

export { type AuthUser };

export const authApi = {
  login: async (input: LoginInput): Promise<AuthUser> => {
    return trpc.auth.login.mutateAsync(input);
  },

  register: async (input: RegisterInput): Promise<AuthUser> => {
    return trpc.auth.register.mutateAsync(input);
  },

  getCurrentUser: async (): Promise<AuthUser> => {
    return trpc.auth.me.query();
  },

  logout: async (): Promise<void> => {
    await trpc.auth.logout.mutateAsync();
  },
};
