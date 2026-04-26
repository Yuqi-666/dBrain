import { mergeRouters } from "../server";
import { nodeSemanticRouter } from "./node-semantic";
import { edgeSemanticRouter } from "./edge-semantic";
import { nodeRouter } from "./node";
import { edgeRouter } from "./edge";
import { viewRouter } from "./view";

export const appRouter = mergeRouters(
  nodeSemanticRouter,
  edgeSemanticRouter,
  nodeRouter,
  edgeRouter,
  viewRouter,
);

export type AppRouter = typeof appRouter;
