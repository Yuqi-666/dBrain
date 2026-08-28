import type { RecordModel } from "pocketbase";
import { FilterConfig } from "@workspace/domain/models/filter/value-objects";
import { View } from "@workspace/domain/models/view/entities";
import { ViewId, VisualConfig, ViewType } from "@workspace/domain/models/view/value-objects";

export class ViewMapper {
  static toDomain(record: RecordModel): View {
    return View.create({
      id: ViewId.create(record.id),
      name: record.name as string,
      viewType: ViewType.fromString(record.viewType as string),
      visualConfig: VisualConfig.create(
        record.visualConfig as Partial<VisualConfig>,
      ),
      filterConfig: FilterConfig.create(record.filterConfig),
      isPinned: record.isPinned as boolean,
      workspaceId: record.workspaceId as string | undefined,
    });
  }

  static toRecord(view: View): Partial<RecordModel> {
    return {
      id: view.id.value,
      name: view.name,
      viewType: view.viewType.getValue(),
      visualConfig: {
        backgroundColor: view.visualConfig.backgroundColor,
        backgroundStyle: view.visualConfig.backgroundStyle,
        gridSpacing: view.visualConfig.gridSpacing,
        gridColor: view.visualConfig.gridColor,
        snapToGrid: view.visualConfig.snapToGrid,
        showMinimap: view.visualConfig.showMinimap,
      },
      filterConfig: {
        selectedNodes: view.filterConfig.selectedNodes,
        ruleGroup: view.filterConfig.ruleGroup,
        collectionType: view.filterConfig.collectionType,
      },
      isPinned: view.isPinned,
      workspaceId: view.workspaceId,
    };
  }
}
