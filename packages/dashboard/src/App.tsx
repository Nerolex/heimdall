import React, { useEffect, useState, useRef } from 'react';
import type { DashboardConfig, OverlayMode } from '@heimdall/shared';
import { normalizeCycleInterval, normalizeOverlayMode, normalizeViewOrder } from '@heimdall/shared';
import { ViewRenderer } from './components/shared/ViewRenderer';
import { EmptyState } from './components/shared/EmptyState';
import { ErrorState } from './components/shared/ErrorState';
import { Overlay } from './components/overlay/Overlay';
import { KeepAwake } from './components/keepawake';

type AppState = 'loading' | 'ready' | 'empty' | 'error';

const FADE_DURATION = 1000;

/** Merge top-level config sections into view settings so views inherit shared credentials */
function mergeViewSettings(config: DashboardConfig, view: DashboardConfig['views'][number]): Record<string, unknown> {
  const base = view.settings || {};
  const type = view.type;
  const cfg = config as Record<string, unknown>;
  if (type.startsWith('retro') && cfg.retro) {
    return { ...cfg.retro as Record<string, unknown>, ...base };
  }
  if (type.startsWith('gaming')) {
    const retro = (cfg.retro as Record<string, unknown>) || {};
    const steam = (cfg.steam as Record<string, unknown>) || {};
    return {
      raApiUser: retro.apiUser,
      raApiKey: retro.apiKey,
      raUser: retro.user,
      steamApiKey: steam.apiKey,
      steamId: steam.steamId,
      igdbClientId: retro.igdbClientId,
      igdbClientSecret: retro.igdbClientSecret,
      sgdbApiKey: retro.sgdbApiKey,
      ...base,
    };
  }
  if (type.startsWith('calendar') && cfg.calendar) {
    return { ...cfg.calendar as Record<string, unknown>, ...base };
  }
  if (type.startsWith('music') && cfg.lastfm) {
    const lastfm = cfg.lastfm as Record<string, unknown>;
    return { lastfmApiKey: lastfm.apiKey, lastfmUser: lastfm.user, ...base };
  }
  if (type.startsWith('weather') && config.weather) {
    return { ...config.weather as Record<string, unknown>, ...base };
  }
  if (type === 'clock' && config.weather) {
    const w = config.weather as Record<string, unknown>;
    return { weatherApiKey: w.apiKey, weatherCity: w.city, weatherUnits: w.units, ...base };
  }
  return base as Record<string, unknown>;
}

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
  const isTransitioning = useRef(false);
  const viewHistory = useRef<number[]>([0]);

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

  // Transition to a specific view index with fade
  function transitionTo(nextIdx: number): void {
    if (!config || isTransitioning.current) return;
    isTransitioning.current = true;

    const currentIdx = activeViewIndex;
    const currentMode = getOverlayMode(config, currentIdx);
    const nextMode = getOverlayMode(config, nextIdx);

    setVisible(false);
    if (showsClock(currentMode) && !showsClock(nextMode)) setClockVisible(false);
    if (showsWeather(currentMode) && !showsWeather(nextMode)) setWeatherVisible(false);

    setTimeout(() => {
      setActiveViewIndex(nextIdx);
      setVisible(true);
      setClockVisible(showsClock(nextMode));
      setWeatherVisible(showsWeather(nextMode));
      isTransitioning.current = false;
    }, FADE_DURATION);
  }

  // Get next view index (sequential or random with frequency weighting)
  function getNextIndex(currentIdx: number): number {
    if (!config) return 0;
    const viewOrder = normalizeViewOrder(config.viewOrder);
    if (viewOrder === 'random') {
      const weights = config.views.map((v, i) => {
        if (i === currentIdx) return 0;
        const freq = v.frequency || 'normal';
        return freq === 'high' ? 3 : freq === 'low' ? 0.5 : 1;
      });
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let r = Math.random() * totalWeight;
      for (let i = 0; i < weights.length; i++) {
        r -= weights[i];
        if (r <= 0) return i;
      }
      return (currentIdx + 1) % config.views.length;
    }
    return (currentIdx + 1) % config.views.length;
  }

  // Handle tap/click navigation
  function handleNavClick(e: React.MouseEvent<HTMLDivElement>): void {
    if (!config || config.views.length <= 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeftHalf = x < rect.width / 2;

    // Reset auto-cycle timer
    if (cycleTimer.current) clearTimeout(cycleTimer.current);

    if (isLeftHalf) {
      // Go back in history
      if (viewHistory.current.length > 1) {
        viewHistory.current.pop();
        const prevIdx = viewHistory.current[viewHistory.current.length - 1];
        transitionTo(prevIdx);
      }
    } else {
      // Go forward
      const nextIdx = getNextIndex(activeViewIndex);
      viewHistory.current.push(nextIdx);
      transitionTo(nextIdx);
    }
  }

  // View cycling with fade transition
  useEffect(() => {
    if (!config || config.views.length <= 1) return;

    const interval = normalizeCycleInterval(config.cycleInterval) * 1000;

    function scheduleCycle(): void {
      cycleTimer.current = setTimeout(() => {
        const nextIdx = getNextIndex(activeViewIndex);
        viewHistory.current.push(nextIdx);
        transitionTo(nextIdx);
        scheduleCycle();
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
    <div
      onClick={handleNavClick}
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        cursor: 'pointer',
        '--overlay-height': hasOverlay ? '8vw' : '0px',
      } as React.CSSProperties}
    >
      <KeepAwake mode={(config as Record<string, unknown>).keepAwake as boolean | 'auto' | undefined} />
      <Overlay
        clockVisible={clockVisible}
        weatherVisible={weatherVisible}
        weatherConfig={config!.weather}
        showFullscreenButton={config!.showFullscreenButton}
      />
      <div
        style={{
          width: '100%',
          height: '100%',
          opacity: visible ? 1 : 0,
          transition: `opacity ${FADE_DURATION}ms ease-in-out`,
        }}
      >
        <ViewRenderer type={view.type} settings={mergeViewSettings(config!, view)} />
      </div>
    </div>
  );
}
