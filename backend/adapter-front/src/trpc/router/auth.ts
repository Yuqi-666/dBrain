import { router, publicProcedure, protectedProcedure } from "../server";
import { container } from "../../di/container";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Email } from "@workspace/domain/models/user/value-objects";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  nickname: z.string().min(1).max(50),
});

export const authRouter = router({
  login: publicProcedure.input(loginSchema).mutation(async ({ input }) => {
    const { email, password } = input;
    const emailVO = new Email(email);

    const result = await container().userRepository.verifyPassword(emailVO, password);

    if (!result.valid || !result.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }

    return {
      user: result.user.toPublic(),
      token: result.token,
    };
  }),

  register: publicProcedure.input(registerSchema).mutation(async ({ input }) => {
    const { email, password, nickname } = input;

    try {
      const emailVO = new Email(email);

      const existing = await container().userRepository.findByEmail(emailVO);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email already registered",
        });
      }

      const user = await container().userRepository.createUser(emailVO, password, nickname);

      return {
        user: user.toPublic(),
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : "Registration failed";
      throw new TRPCError({
        code: "BAD_REQUEST",
        message,
      });
    }
  }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await container().userRepository.findById(ctx.userId);

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    return user.toPublic();
  }),

  logout: protectedProcedure.mutation(async () => {
    return { success: true };
  }),
});
