import { router } from "../server";
import { nodeSemanticRouter } from "./node-semantic";
import { edgeSemanticRouter } from "./edge-semantic";
import { nodeRouter } from "./node";
import { edgeRouter } from "./edge";
import { viewRouter } from "./view";
import { nodeTagRouter } from "./node-tag";
import { eventRouter } from "./event";
import { authRouter } from "./auth";
import { workspaceRouter } from "./workspace";

export const appRouter = router({
  auth: authRouter,
  node: nodeRouter,
  edge: edgeRouter,
  view: viewRouter,
  nodeSemantic: nodeSemanticRouter,
  edgeSemantic: edgeSemanticRouter,
  nodeTag: nodeTagRouter,
  event: eventRouter,
  workspace: workspaceRouter,
});

export type AppRouter = typeof appRouter;
