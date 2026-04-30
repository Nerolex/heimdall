import React, { useState } from 'react';
import { DISPLAY_MODE_CSS, normalizeDisplayMode } from '@heimdall/shared';

interface ImageViewProps {
  settings: Record<string, unknown>;
}

/** Image component with configurable display modes */
export function ImageView({ settings }: ImageViewProps): React.ReactElement {
  const [hasError, setHasError] = useState(false);
  const src = settings.src as string | undefined;
  const displayMode = normalizeDisplayMode(settings.displayMode);
  const objectFit = DISPLAY_MODE_CSS[displayMode];

  if (!src) {
    return (
      <div
        data-testid="image-placeholder"
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#888',
          fontSize: '1.5rem',
        }}
      >
        No image source configured
      </div>
    );
  }

  if (hasError) {
    return (
      <div
        data-testid="image-error"
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#888',
          fontSize: '1.5rem',
        }}
      >
        Failed to load image
      </div>
    );
  }

  return (
    <div
      data-testid="image-container"
      style={{ width: '100%', height: '100%', overflow: 'hidden' }}
    >
      <img
        src={src}
        alt=""
        onError={() => setHasError(true)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: objectFit as React.CSSProperties['objectFit'],
          objectPosition: 'center',
          display: 'block',
        }}
      />
    </div>
  );
}
