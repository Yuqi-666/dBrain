import { router } from "../server";
import { nodeSemanticRouter } from "./node-semantic";
import { edgeSemanticRouter } from "./edge-semantic";
import { nodeRouter } from "./node";
import { edgeRouter } from "./edge";
import { viewRouter } from "./view";

export const appRouter = router({
  node: nodeRouter,
  edge: edgeRouter,
  view: viewRouter,
  nodeSemantic: nodeSemanticRouter,
  edgeSemantic: edgeSemanticRouter,
});

export type AppRouter = typeof appRouter;
