import { memo } from 'react';
import { HierarchyEdge } from './HierarchyEdge';
import { FlowEdge } from './FlowEdge';
import { AssociationEdge } from './AssociationEdge';
import { InteractionEdge } from './InteractionEdge';

export const edgeTypes = {
  hierarchy: memo(HierarchyEdge),
  flow: memo(FlowEdge),
  association: memo(AssociationEdge),
  interaction: memo(InteractionEdge),
  default: memo(HierarchyEdge),
};

export { HierarchyEdge, FlowEdge, AssociationEdge, InteractionEdge };
