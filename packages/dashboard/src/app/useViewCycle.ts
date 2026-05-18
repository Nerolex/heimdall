import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { DashboardConfig } from '@heimdall/shared';
import { normalizeCycleInterval, normalizeViewOrder } from '@heimdall/shared';
import { getOverlayMode, showsClock, showsWeather } from './viewSettings';

interface UseViewCycleResult {
  activeViewIndex: number;
  nextViewIndex: number | null;
  detailMode: boolean;
  visible: boolean;
  clockVisible: boolean;
  weatherVisible: boolean;
  hasOverlay: boolean;
  handleNavClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleDetailClose: () => void;
  withInternalSettings: (settings: Record<string, unknown>) => Record<string, unknown>;
}

const FADE_DURATION = 1000;

export function useViewCycle(
  config: DashboardConfig | null,
  hasDetailForType: (type: string) => boolean
): UseViewCycleResult {
  const [activeViewIndex, setActiveViewIndex] = useState(0);
  const activeViewIndexRef = useRef(0);
  const [nextViewIndex, setNextViewIndex] = useState<number | null>(null);
  const nextViewIndexRef = useRef<number | null>(null);
  const [detailMode, setDetailMode] = useState(false);
  const [visible, setVisible] = useState(true);
  const [clockVisible, setClockVisible] = useState(true);
  const [weatherVisible, setWeatherVisible] = useState(true);
  const cycleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTransitioning = useRef(false);
  const viewHistory = useRef<number[]>([0]);
  const viewSnapshots = useRef<Map<number, unknown>>(new Map());
  const currentHistoryPos = useRef(0);

  function getNextIndex(currentIdx: number): number {
    if (!config) return 0;
    const viewOrder = normalizeViewOrder(config.viewOrder);
    if (viewOrder === 'random') {
      const weights: number[] = config.views.map((v, i) => {
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

  const transitionTo = useCallback((nextIdx: number): void => {
    if (!config || isTransitioning.current) return;
    isTransitioning.current = true;

    const currentIdx = activeViewIndexRef.current;
    const currentMode = getOverlayMode(config, currentIdx);
    const nextMode = getOverlayMode(config, nextIdx);

    setVisible(false);
    if (showsClock(currentMode) && !showsClock(nextMode)) setClockVisible(false);
    if (showsWeather(currentMode) && !showsWeather(nextMode)) setWeatherVisible(false);

    setTimeout(() => {
      activeViewIndexRef.current = nextIdx;
      setActiveViewIndex(nextIdx);
      setVisible(true);
      setClockVisible(showsClock(nextMode));
      setWeatherVisible(showsWeather(nextMode));
      isTransitioning.current = false;
    }, FADE_DURATION);
  }, [config]);

  const onActiveViewStateChange = useCallback((state: unknown) => {
    viewSnapshots.current.set(currentHistoryPos.current, state);
  }, []);

  const onActiveViewEmpty = useCallback(() => {
    if (!config) return;
    const view = config.views[activeViewIndexRef.current];
    if (!view?.skipIfEmpty) return;
    if (cycleTimer.current) clearTimeout(cycleTimer.current);
    const nextIdx = nextViewIndexRef.current ?? getNextIndex(activeViewIndexRef.current);
    viewSnapshots.current.delete(viewHistory.current.length);
    viewHistory.current.push(nextIdx);
    transitionTo(nextIdx);
  }, [config, transitionTo]);

  // Reset overlay state when config first becomes available.
  useEffect(() => {
    if (!config || config.views.length === 0) return;
    const firstOverlay = getOverlayMode(config, activeViewIndexRef.current);
    setClockVisible(showsClock(firstOverlay));
    setWeatherVisible(showsWeather(firstOverlay));
  }, [config]);

  // Preload the next view whenever active view changes.
  useEffect(() => {
    if (!config || config.views.length <= 1) return;
    const next = getNextIndex(activeViewIndex);
    setNextViewIndex(next);
    nextViewIndexRef.current = next;
  }, [config, activeViewIndex]);

  const handleNavClick = useCallback((e: React.MouseEvent<HTMLDivElement>): void => {
    if (!config) return;
    if (detailMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const zone = x / rect.width;

    if (cycleTimer.current) clearTimeout(cycleTimer.current);

    if (zone < 0.25) {
      if (viewHistory.current.length > 1) {
        viewHistory.current.pop();
        const prevIdx = viewHistory.current[viewHistory.current.length - 1];
        transitionTo(prevIdx);
      }
      return;
    }

    if (zone > 0.75) {
      const nextIdx = nextViewIndexRef.current ?? getNextIndex(activeViewIndexRef.current);
      viewSnapshots.current.delete(viewHistory.current.length);
      viewHistory.current.push(nextIdx);
      transitionTo(nextIdx);
      return;
    }

    const view = config.views[activeViewIndexRef.current];
    if (view && hasDetailForType(view.type)) {
      setDetailMode(true);
    }
  }, [config, detailMode, hasDetailForType, transitionTo]);

  const handleDetailClose = useCallback(() => {
    setDetailMode(false);
    if (cycleTimer.current) clearTimeout(cycleTimer.current);
  }, []);

  // View cycling with fade transition (paused during detail mode).
  useEffect(() => {
    if (!config || config.views.length <= 1 || detailMode) return;

    const interval = normalizeCycleInterval(config.cycleInterval) * 1000;
    cycleTimer.current = setTimeout(() => {
      const nextIdx = nextViewIndexRef.current ?? getNextIndex(activeViewIndexRef.current);
      viewSnapshots.current.delete(viewHistory.current.length);
      viewHistory.current.push(nextIdx);
      transitionTo(nextIdx);
    }, interval - FADE_DURATION);

    return () => {
      if (cycleTimer.current) clearTimeout(cycleTimer.current);
    };
  }, [config, detailMode, activeViewIndex, transitionTo]);

  const withInternalSettings = useCallback((settings: Record<string, unknown>) => {
    currentHistoryPos.current = viewHistory.current.length - 1;
    return {
      ...settings,
      __savedState: viewSnapshots.current.get(currentHistoryPos.current),
      __onStateChange: onActiveViewStateChange,
      __onEmpty: onActiveViewEmpty,
    };
  }, [onActiveViewEmpty, onActiveViewStateChange]);

  return {
    activeViewIndex,
    nextViewIndex,
    detailMode,
    visible,
    clockVisible,
    weatherVisible,
    hasOverlay: clockVisible || weatherVisible,
    handleNavClick,
    handleDetailClose,
    withInternalSettings,
  };
}
