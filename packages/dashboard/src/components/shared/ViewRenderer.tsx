import React from 'react';
import { getComponent } from '../registry';
import { ErrorState } from './ErrorState';

interface ViewRendererProps {
  type: string;
  settings: Record<string, unknown>;
}

/** Renders the active view by looking up the component type in the registry */
export function ViewRenderer({ type, settings }: ViewRendererProps): React.ReactElement {
  const Component = getComponent(type);

  if (!Component) {
    return <ErrorState message={`Unknown component type: "${type}"`} />;
  }

  return <Component settings={settings} />;
}
