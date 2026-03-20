import type { View } from "@workspace/interfaces";

export interface ViewsResponse {
  views: View[];
  total: number;
}

const MOCK_VIEWS: View[] = [];

export async function getViews(): Promise<ViewsResponse> {
  return Promise.resolve({
    views: MOCK_VIEWS,
    total: MOCK_VIEWS.length,
  });
}

export async function getView(viewId: string): Promise<View | null> {
  const view = MOCK_VIEWS.find((v) => v.id === viewId);
  return Promise.resolve(view ?? null);
}

export async function createView(view: View): Promise<View> {
  const newView = { ...view, id: view.id || `view-${Date.now()}` };
  MOCK_VIEWS.push(newView);
  return Promise.resolve(newView);
}

export async function updateView(
  viewId: string,
  updates: Partial<View>,
): Promise<View> {
  const index = MOCK_VIEWS.findIndex((v) => v.id === viewId);
  if (index === -1) {
    throw new Error("View not found");
  }
  const updated = { ...MOCK_VIEWS[index], ...updates };
  MOCK_VIEWS[index] = updated;
  return Promise.resolve(updated);
}

export async function deleteView(viewId: string): Promise<void> {
  const index = MOCK_VIEWS.findIndex((v) => v.id === viewId);
  if (index !== -1) {
    MOCK_VIEWS.splice(index, 1);
  }
  return Promise.resolve();
}
