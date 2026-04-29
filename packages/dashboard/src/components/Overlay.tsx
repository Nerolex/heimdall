import React from 'react';
import type { WeatherConfig } from '@heimdall/shared';
import { Clock } from './Clock';
import { Weather } from './Weather';

interface OverlayProps {
  clockVisible: boolean;
  weatherVisible: boolean;
  weatherConfig?: WeatherConfig;
}

/** Persistent overlay with clock and/or weather in the upper-left */
export function Overlay({ clockVisible, weatherVisible, weatherConfig }: OverlayProps): React.ReactElement {
  const showWeatherComponent = weatherConfig != null;

  return (
    <div
      data-testid="overlay"
      style={{
        position: 'absolute',
        top: '1.5rem',
        left: '1.5rem',
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
    </div>
  );
}
