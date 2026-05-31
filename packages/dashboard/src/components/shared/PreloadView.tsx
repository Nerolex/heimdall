import React from 'react';
import { ViewRenderer } from './ViewRenderer';

interface PreloadViewProps {
  type: string;
  settings: Record<string, unknown>;
}

/** Renders the next view at opacity 0 so assets are warm before the transition. */
export function PreloadView({ type, settings }: PreloadViewProps): React.ReactElement {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        opacity: 0,
        pointerEvents: 'none',
        zIndex: -1,
      }}
    >
      <ViewRenderer type={type} settings={settings} />
    </div>
  );
}
