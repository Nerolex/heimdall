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
        zIndex: 200,
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
            background: 'transparent',
            border: 'none',
            borderRadius: '0.5vw',
            padding: '0.6vw',
            cursor: 'pointer',
            opacity: 0.35,
            transition: 'opacity 0.3s',
            lineHeight: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '0.35'; }}
          title={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
        >
          <svg width="1.6vw" height="1.6vw" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isFullscreen ? (
              <>
                <polyline points="4 14 10 14 10 20" />
                <polyline points="20 10 14 10 14 4" />
                <line x1="14" y1="10" x2="21" y2="3" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </>
            ) : (
              <>
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </>
            )}
          </svg>
        </button>
      )}
    </div>
  );
}
