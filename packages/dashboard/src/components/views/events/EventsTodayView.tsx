import React from 'react';
import { ShowcaseView } from '../shared/ShowcaseView';
import type { ViewInternalSettings } from '../../../app/internalSettings';

export function EventsTodayView({ settings }: { settings: Record<string, unknown> }) {
  return (
    <ShowcaseView
      source="events-today"
      skipIfEmpty={settings.skipIfEmpty !== false}
      internalSettings={settings as ViewInternalSettings}
    />
  );
}
