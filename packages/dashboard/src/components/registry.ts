import type { ComponentType } from 'react';
import type { ComponentProps } from '@heimdall/shared';

/** Registry mapping component type string → React component */
const registry = new Map<string, ComponentType<{ settings: Record<string, unknown> }>>();

/** Register a component by type name */
export function registerComponent(
  type: string,
  component: ComponentType<{ settings: Record<string, unknown> }>
): void {
  registry.set(type, component);
}

/** Look up a component by type name. Returns undefined if not found. */
export function getComponent(
  type: string
): ComponentType<{ settings: Record<string, unknown> }> | undefined {
  return registry.get(type);
}

// Register built-in components
import { ImageView } from './ImageView';
import { WeatherView } from './WeatherView';
import { CalendarAgendaView } from './CalendarAgendaView';
import { CalendarDayView } from './CalendarDayView';
import { CalendarWeekView } from './CalendarWeekView';
import { CalendarMonthView } from './CalendarMonthView';
import { PhotosMemoriesView } from './PhotosMemoriesView';
import { PhotosRandomView } from './PhotosRandomView';
import { RetroRecentView } from './RetroRecentView';
import { RetroPlayingView } from './RetroPlayingView';
import { RetroProfileView } from './RetroProfileView';
registerComponent('image', ImageView);
registerComponent('weather', WeatherView);
registerComponent('calendar-agenda', CalendarAgendaView);
registerComponent('calendar-day', CalendarDayView);
registerComponent('calendar-week', CalendarWeekView);
registerComponent('calendar-month', CalendarMonthView);
registerComponent('photos-memories', PhotosMemoriesView);
registerComponent('photos-random', PhotosRandomView);
registerComponent('retro-recent', RetroRecentView);
registerComponent('retro-playing', RetroPlayingView);
registerComponent('retro-profile', RetroProfileView);
