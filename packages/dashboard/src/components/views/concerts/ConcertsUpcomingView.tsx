import React from 'react';
import { ShowcaseView } from '../shared/ShowcaseView';
import type { ViewInternalSettings } from '../../../app/internalSettings';

export function ConcertsUpcomingView({ settings }: { settings: Record<string, unknown> }) {
  return (
    <ShowcaseView
      source="concerts"
      skipIfEmpty={settings.skipIfEmpty !== false}
      internalSettings={settings as ViewInternalSettings}
    />
  );
}
