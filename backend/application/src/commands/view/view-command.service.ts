import type { IViewRepository } from "@workspace/domain";
import type { IEventBus } from "@workspace/domain";
import type { ViewCreated, ViewDeleted } from "@workspace/domain";
import type { CreateViewCommand, UpdateViewCommand, DeleteViewCommand } from "./command";
import type { ViewDTO, VisualConfigDTO } from "../../dto/view.dto";
import { View } from "@workspace/domain/models/view/entities";
import { ViewId, LayoutType, VisualConfig } from "@workspace/domain/models/view/value-objects";
import type { FilterConfig } from "@workspace/interfaces/models/filter";

function toViewDTO(view: View): ViewDTO {
  return {
    id: view.id.toString(),
    name: view.name,
    layout: view.layout.getValue() as ViewDTO["layout"],
    visualConfig: {
      backgroundColor: view.visualConfig.backgroundColor,
      backgroundStyle: view.visualConfig.backgroundStyle,
      gridSpacing: view.visualConfig.gridSpacing,
      gridColor: view.visualConfig.gridColor,
      snapToGrid: view.visualConfig.snapToGrid,
      showMinimap: view.visualConfig.showMinimap,
    },
    filterConfig: view.filterConfig,
    isPinned: view.isPinned,
  };
}

export class ViewCommandService {
  constructor(
    private readonly viewRepository: IViewRepository,
    private readonly eventBus: IEventBus,
  ) {}

  async createView(cmd: CreateViewCommand): Promise<ViewDTO> {
    const visualConfig = VisualConfig.create({
      backgroundColor: cmd.visualConfig?.backgroundColor,
    });

    const filterConfig: FilterConfig = {
      selectedNodes: cmd.filterConfig?.selectedNodes,
      ruleGroup: cmd.filterConfig?.ruleGroup,
      collectionType: cmd.filterConfig?.collectionType,
    };

    const view = View.create({
      id: cmd.id,
      name: cmd.name,
      layout: LayoutType.fromString(cmd.layout),
      visualConfig,
      filterConfig,
      isPinned: cmd.isPinned ?? false,
    });

    const saved = await this.viewRepository.save(view);

    const event: ViewCreated = {
      eventType: "ViewCreated",
      aggregateId: saved.id.toString(),
      metadata: {
        occurredAt: new Date().toISOString(),
        eventVersion: 1,
      },
      data: {
        id: saved.id.toString(),
        name: saved.name,
        layout: saved.layout.getValue(),
      },
    };
    this.eventBus.publish(event);

    return toViewDTO(saved);
  }

  async updateView(cmd: UpdateViewCommand): Promise<ViewDTO> {
    const id = ViewId.create(cmd.id);
    const view = await this.viewRepository.findById(id);

    if (!view) {
      throw new Error(`View not found: ${cmd.id}`);
    }

    let updated = view;

    if (cmd.name !== undefined) {
      updated = updated.updateName(cmd.name);
    }

    if (cmd.layout !== undefined) {
      updated = updated.updateLayout(LayoutType.fromString(cmd.layout));
    }

    if (cmd.visualConfig !== undefined) {
      const newVisualConfig = VisualConfig.create({
        backgroundColor: cmd.visualConfig.backgroundColor,
      });
      updated = updated.updateVisualConfig(newVisualConfig);
    }

    if (cmd.filterConfig !== undefined) {
      const newFilterConfig: FilterConfig = {
        selectedNodes: cmd.filterConfig.selectedNodes,
        ruleGroup: cmd.filterConfig.ruleGroup,
        collectionType: cmd.filterConfig.collectionType,
      };
      updated = updated.updateFilterConfig(newFilterConfig);
    }

    if (cmd.isPinned !== undefined) {
      updated = cmd.isPinned ? updated.pin() : updated.unpin();
    }

    const saved = await this.viewRepository.save(updated);
    return toViewDTO(saved);
  }

  async deleteView(cmd: DeleteViewCommand): Promise<void> {
    const id = ViewId.create(cmd.id);
    await this.viewRepository.delete(id);

    const event: ViewDeleted = {
      eventType: "ViewDeleted",
      aggregateId: cmd.id,
      metadata: {
        occurredAt: new Date().toISOString(),
        eventVersion: 1,
      },
      data: {
        id: cmd.id,
      },
    };
    this.eventBus.publish(event);
  }
}