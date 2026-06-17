import React from 'react';
import { ConcertsShowcaseView } from './ConcertsShowcaseView';
import type { ViewInternalSettings } from '../../../app/internalSettings';

export function ConcertsUpcomingView({ settings }: { settings: Record<string, unknown> }) {
  return (
    <ConcertsShowcaseView
      skipIfEmpty={settings.skipIfEmpty !== false}
      internalSettings={settings as ViewInternalSettings}
    />
  );
}
