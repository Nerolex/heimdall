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
import { ImageView } from './shared/ImageView';
import { WeatherView } from './views/weather';
import { CalendarAgendaView, CalendarDayView, CalendarWeekView, CalendarMonthView } from './views/calendar';
import { PhotosMemoriesView, PhotosRandomView } from './views/photos';
import { RetroRecentView, RetroPlayingView, RetroProfileView, RetroShowcaseView } from './views/retro';
import { MusicNowPlayingView } from './views/music';
import { GamingNowView, GamingRecentView, GamingShowcaseView, GamingAchievementView } from './views/gaming';
registerComponent('image', ImageView);
registerComponent('weather', WeatherView);
registerComponent('calendar-agenda', CalendarAgendaView);
registerComponent('calendar-day', CalendarDayView);
registerComponent('calendar-week', CalendarWeekView);
registerComponent('calendar-month', CalendarMonthView);
registerComponent('calendar', CalendarDayView);
registerComponent('photos-memories', PhotosMemoriesView);
registerComponent('photos-random', PhotosRandomView);
registerComponent('retro-recent', RetroRecentView);
registerComponent('retro-playing', RetroPlayingView);
registerComponent('retro-profile', RetroProfileView);
registerComponent('retro-showcase', RetroShowcaseView);
registerComponent('music-now-playing', MusicNowPlayingView);
registerComponent('gaming-now', GamingNowView);
registerComponent('gaming-recent', GamingRecentView);
registerComponent('gaming-showcase', GamingShowcaseView);
registerComponent('gaming-achievement', GamingAchievementView);
