import React, { useState, useCallback } from 'react';
import type { WeatherConfig } from '@heimdall/shared';
import { Clock } from './Clock';
import { Weather } from './Weather';

interface OverlayProps {
  clockVisible: boolean;
  weatherVisible: boolean;
  weatherConfig?: WeatherConfig;
  showFullscreenButton?: boolean;
}

function toggleFullscreen(): void {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen().catch(() => {});
  }
}

/** Persistent overlay with clock and/or weather in the upper-left */
export function Overlay({ clockVisible, weatherVisible, weatherConfig, showFullscreenButton }: OverlayProps): React.ReactElement {
  const showWeatherComponent = weatherConfig != null;
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  const handleFullscreen = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFullscreen();
    setTimeout(() => setIsFullscreen(!!document.fullscreenElement), 200);
  }, []);

  return (
    <div
      data-testid="overlay"
      style={{
        position: 'absolute',
        top: '1.5rem',
        left: '1.5rem',
        right: '1.5rem',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        color: '#fff',
        textShadow: '0 2px 8px rgba(0,0,0,0.7)',
        pointerEvents: 'none',
      }}
    >
      <span style={{
        opacity: clockVisible ? 1 : 0,
        transition: 'opacity 1s ease-in-out',
      }}>
        <Clock />
      </span>
      {showWeatherComponent && (
        <span style={{
          opacity: weatherVisible ? 1 : 0,
          transition: 'opacity 1s ease-in-out',
        }}>
          <Weather config={weatherConfig} />
        </span>
      )}
      {showFullscreenButton && (
        <button
          onClick={handleFullscreen}
          data-testid="fullscreen-button"
          style={{
            marginLeft: 'auto',
            pointerEvents: 'auto',
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '0.8vw',
            padding: '0.8vw 1.2vw',
            cursor: 'pointer',
            color: '#fff',
            fontSize: '2vw',
            lineHeight: 1,
            backdropFilter: 'blur(4px)',
            transition: 'opacity 0.3s',
          }}
          title={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
        >
          {isFullscreen ? '⊠' : '⛶'}
        </button>
      )}
    </div>
  );
}
