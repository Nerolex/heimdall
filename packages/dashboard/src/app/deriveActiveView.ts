import type { DashboardConfig, ViewEntry } from '@heimdall/shared';
import { getDetailComponent } from '../components/registry';
import { mergeViewSettings } from './viewSettings';
import type { ComponentType } from 'react';

export interface ActiveView {
  view: ViewEntry;
  nextView: ViewEntry | null;
  shouldPreloadNext: boolean;
  DetailComponent: ComponentType<{ settings: Record<string, unknown>; onClose: () => void }> | null;
  activeSettings: Record<string, unknown>;
}

/**
 * Derives all view-related state from config + cycle position.
 * Keeps App.tsx focused on rendering, not view-selection logic.
 */
export function deriveActiveView(
  config: DashboardConfig,
  activeViewIndex: number,
  nextViewIndex: number | null,
  detailMode: boolean,
  withInternalSettings: (s: Record<string, unknown>) => Record<string, unknown>
): ActiveView {
  const view = config.views[activeViewIndex];
  const nextView = nextViewIndex != null ? config.views[nextViewIndex] ?? null : null;
  const shouldPreloadNext = nextView != null && nextView.type !== view.type;
  const DetailComponent = detailMode ? getDetailComponent(view.type) ?? null : null;
  const baseSettings = mergeViewSettings(config, view);
  const activeSettings = withInternalSettings(baseSettings);

  return { view, nextView, shouldPreloadNext, DetailComponent, activeSettings };
}
