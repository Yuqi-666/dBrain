import { router } from "../server";
import { nodeSemanticRouter } from "./node-semantic";
import { edgeSemanticRouter } from "./edge-semantic";
import { nodeRouter } from "./node";
import { edgeRouter } from "./edge";
import { viewRouter } from "./view";
import { nodeTagRouter } from "./node-tag";

export const appRouter = router({
  node: nodeRouter,
  edge: edgeRouter,
  view: viewRouter,
  nodeSemantic: nodeSemanticRouter,
  edgeSemantic: edgeSemanticRouter,
  nodeTag: nodeTagRouter,
});

export type AppRouter = typeof appRouter;
