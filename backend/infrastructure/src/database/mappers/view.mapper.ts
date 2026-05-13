import type { RecordModel } from "pocketbase";

import type { FilterConfig } from "@workspace/interfaces/models/filter";
import { View } from "@workspace/domain/models/view/entities";
import { ViewId, LayoutType, VisualConfig } from "@workspace/domain/models/view/value-objects";

export class ViewMapper {
  static toDomain(record: RecordModel): View {
    return View.create({
      id: ViewId.create(record.id),
      name: record.name as string,
      layout: LayoutType.fromString(record.layout as string),
      visualConfig: VisualConfig.create(
        record.visualConfig as Partial<VisualConfig>,
      ),
      filterConfig: record.filterConfig as FilterConfig,
      isPinned: record.isPinned as boolean,
    });
  }

  static toRecord(view: View): Partial<RecordModel> {
    return {
      id: view.id.value,
      name: view.name,
      layout: view.layout.getValue(),
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
    };
  }
}
