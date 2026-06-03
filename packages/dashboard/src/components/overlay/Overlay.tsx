import React, { useState, useCallback, useEffect } from 'react';
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

  const [isHovered, setIsHovered] = useState(false);

  // Track real browser fullscreen state — handles Esc, rejected promises, external exits
  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const buttonOpacity = isHovered ? 0.75 : 0;

  const handleFullscreen = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFullscreen();
    // isFullscreen updates via the fullscreenchange event listener above
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
            background: isHovered ? 'rgba(0, 0, 0, 0.55)' : 'rgba(0, 0, 0, 0.35)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: '50%',
            width: 'clamp(36px, 3.5vw, 52px)',
            height: 'clamp(36px, 3.5vw, 52px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            cursor: 'pointer',
            opacity: buttonOpacity,
            transition: 'opacity 0.4s, background 0.25s',
            lineHeight: 0,
            flexShrink: 0,
          }}
          onMouseEnter={e => { e.stopPropagation(); setIsHovered(true); }}
          onMouseLeave={e => { e.stopPropagation(); setIsHovered(false); }}
          title={isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
        >
          <svg width="45%" height="45%" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
