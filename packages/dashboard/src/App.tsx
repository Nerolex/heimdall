import React, { useEffect, useState, useRef } from 'react';
import type { DashboardConfig, OverlayMode } from '@heimdall/shared';
import { normalizeCycleInterval, normalizeOverlayMode, normalizeViewOrder } from '@heimdall/shared';
import { ViewRenderer } from './components/ViewRenderer';
import { EmptyState } from './components/EmptyState';
import { ErrorState } from './components/ErrorState';
import { Overlay } from './components/Overlay';

type AppState = 'loading' | 'ready' | 'empty' | 'error';

const FADE_DURATION = 1000;

function getOverlayMode(config: DashboardConfig, index: number): OverlayMode {
  return normalizeOverlayMode(config.views[index]?.overlay);
}

function showsClock(mode: OverlayMode): boolean {
  return mode === 'both' || mode === 'clock';
}

function showsWeather(mode: OverlayMode): boolean {
  return mode === 'both' || mode === 'weather';
}

export function App(): React.ReactElement {
  const [state, setState] = useState<AppState>('loading');
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeViewIndex, setActiveViewIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [clockVisible, setClockVisible] = useState(true);
  const [weatherVisible, setWeatherVisible] = useState(true);
  const cycleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch config on mount
  useEffect(() => {
    fetch('/api/config')
      .then(async (res) => {
        if (res.status === 404) {
          setState('empty');
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({ message: 'Unknown error' }));
          setErrorMessage(body.message || `Server error: ${res.status}`);
          setState('error');
          return;
        }
        const data: DashboardConfig = await res.json();
        if (!data.views || data.views.length === 0) {
          setState('empty');
          return;
        }
        setConfig(data);
        setState('ready');
        // Set initial overlay visibility from first view
        const firstOverlay = normalizeOverlayMode(data.views[0]?.overlay);
        setClockVisible(showsClock(firstOverlay));
        setWeatherVisible(showsWeather(firstOverlay));
      })
      .catch((err) => {
        setErrorMessage(`Failed to connect to server: ${err.message}`);
        setState('error');
      });
  }, []);

  // View cycling with fade transition
  useEffect(() => {
    if (!config || config.views.length <= 1) return;

    const interval = normalizeCycleInterval(config.cycleInterval) * 1000;

    function scheduleCycle(): void {
      cycleTimer.current = setTimeout(() => {
        const currentIdx = activeViewIndex;
        const viewOrder = normalizeViewOrder(config!.viewOrder);
        let nextIdx: number;
        if (viewOrder === 'random') {
          // Pick a random view that isn't the current one
          const candidates = Array.from({ length: config!.views.length }, (_, i) => i).filter((i) => i !== currentIdx);
          nextIdx = candidates[Math.floor(Math.random() * candidates.length)];
        } else {
          nextIdx = (currentIdx + 1) % config!.views.length;
        }
        const currentMode = getOverlayMode(config!, currentIdx);
        const nextMode = getOverlayMode(config!, nextIdx);

        // Fade out view
        setVisible(false);

        // Fade out each overlay element only if it won't persist to next view
        if (showsClock(currentMode) && !showsClock(nextMode)) {
          setClockVisible(false);
        }
        if (showsWeather(currentMode) && !showsWeather(nextMode)) {
          setWeatherVisible(false);
        }

        // Swap view while black, then fade back in
        setTimeout(() => {
          setActiveViewIndex(nextIdx);
          setVisible(true);
          // Fade in each overlay element based on next view's config
          setClockVisible(showsClock(nextMode));
          setWeatherVisible(showsWeather(nextMode));
          scheduleCycle();
        }, FADE_DURATION);
      }, interval - FADE_DURATION);
    }

    scheduleCycle();

    return () => {
      if (cycleTimer.current) clearTimeout(cycleTimer.current);
    };
  }, [config, activeViewIndex]);

  if (state === 'loading') {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
        Loading...
      </div>
    );
  }

  if (state === 'empty') {
    return <EmptyState />;
  }

  if (state === 'error') {
    return <ErrorState message={errorMessage} />;
  }

  const view = config!.views[activeViewIndex];
  const hasOverlay = clockVisible || weatherVisible;

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      position: 'relative',
      '--overlay-height': hasOverlay ? '8vw' : '0px',
    } as React.CSSProperties}>
      <Overlay
        clockVisible={clockVisible}
        weatherVisible={weatherVisible}
        weatherConfig={config!.weather}
      />
      <div
        style={{
          width: '100%',
          height: '100%',
          opacity: visible ? 1 : 0,
          transition: `opacity ${FADE_DURATION}ms ease-in-out`,
        }}
      >
        <ViewRenderer type={view.type} settings={view.settings || {}} />
      </div>
    </div>
  );
}
