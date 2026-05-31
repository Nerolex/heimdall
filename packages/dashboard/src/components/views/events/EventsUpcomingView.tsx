import React from 'react';
import { EventsShowcaseView } from './EventsShowcaseView';
import type { ViewInternalSettings } from '../../../app/internalSettings';

export function EventsUpcomingView({ settings }: { settings: Record<string, unknown> }) {
  const days = typeof settings.days === 'number' ? settings.days : 7;
  return (
    <EventsShowcaseView
      viewType="events-upcoming"
      days={days}
      skipIfEmpty={settings.skipIfEmpty !== false}
      internalSettings={settings as ViewInternalSettings}
    />
  );
}

