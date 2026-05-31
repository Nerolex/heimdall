import React from 'react';
import { EventsShowcaseView } from './EventsShowcaseView';
import type { ViewInternalSettings } from '../../../app/internalSettings';

export function EventsTodayView({ settings }: { settings: Record<string, unknown> }) {
  return (
    <EventsShowcaseView
      viewType="events-today"
      skipIfEmpty={settings.skipIfEmpty !== false}
      internalSettings={settings as ViewInternalSettings}
    />
  );
}
