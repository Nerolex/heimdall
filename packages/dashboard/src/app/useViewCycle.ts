import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { DashboardConfig } from '@heimdall/shared';
import { normalizeCycleInterval, normalizeViewOrder } from '@heimdall/shared';
import { getOverlayMode, showsClock, showsWeather } from './viewSettings';

interface UseViewCycleResult {
  activeViewIndex: number;
  /** Current position in the navigation history stack — use as React key for ViewRenderer */
  historyPos: number;
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

  // Pointer-based navigation history.
  // viewHistory holds the view index at each position; historyPosRef is the cursor.
  const viewHistory = useRef<number[]>([0]);
  const viewSnapshots = useRef<Map<number, unknown>>(new Map());
  const historyPosRef = useRef(0);
  const [historyPos, setHistoryPos] = useState(0);

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
    viewSnapshots.current.set(historyPosRef.current, state);
  }, []);

  const onActiveViewEmpty = useCallback(() => {
    if (!config) return;
    const view = config.views[activeViewIndexRef.current];
    if (!view?.skipIfEmpty) return;
    if (cycleTimer.current) clearTimeout(cycleTimer.current);
    const nextIdx = nextViewIndexRef.current ?? getNextIndex(activeViewIndexRef.current);
    // Truncate any "forward" history past the current position, then push new entry.
    viewHistory.current = viewHistory.current.slice(0, historyPosRef.current + 1);
    viewHistory.current.push(nextIdx);
    const newPos = historyPosRef.current + 1;
    viewSnapshots.current.delete(newPos);
    historyPosRef.current = newPos;
    setHistoryPos(newPos);
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
      // Go back in history (if not at the beginning)
      if (historyPosRef.current > 0) {
        const newPos = historyPosRef.current - 1;
        historyPosRef.current = newPos;
        setHistoryPos(newPos);
        transitionTo(viewHistory.current[newPos]);
      }
      return;
    }

    if (zone > 0.75) {
      if (historyPosRef.current < viewHistory.current.length - 1) {
        // Go forward in existing history (restores saved state for that position)
        const newPos = historyPosRef.current + 1;
        historyPosRef.current = newPos;
        setHistoryPos(newPos);
        transitionTo(viewHistory.current[newPos]);
      } else {
        // At the end of history — push a brand-new forward entry
        const nextIdx = nextViewIndexRef.current ?? getNextIndex(activeViewIndexRef.current);
        viewHistory.current = viewHistory.current.slice(0, historyPosRef.current + 1);
        viewHistory.current.push(nextIdx);
        const newPos = historyPosRef.current + 1;
        viewSnapshots.current.delete(newPos);
        historyPosRef.current = newPos;
        setHistoryPos(newPos);
        transitionTo(nextIdx);
      }
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
      // Truncate any forward history past current position, then push a fresh entry.
      viewHistory.current = viewHistory.current.slice(0, historyPosRef.current + 1);
      viewHistory.current.push(nextIdx);
      const newPos = historyPosRef.current + 1;
      viewSnapshots.current.delete(newPos);
      historyPosRef.current = newPos;
      setHistoryPos(newPos);
      transitionTo(nextIdx);
    }, interval - FADE_DURATION);

    return () => {
      if (cycleTimer.current) clearTimeout(cycleTimer.current);
    };
  }, [config, detailMode, activeViewIndex, transitionTo]);

  const withInternalSettings = useCallback((settings: Record<string, unknown>) => {
    return {
      ...settings,
      __savedState: viewSnapshots.current.get(historyPosRef.current),
      __onStateChange: onActiveViewStateChange,
      __onEmpty: onActiveViewEmpty,
    };
  }, [onActiveViewEmpty, onActiveViewStateChange]);

  return {
    activeViewIndex,
    historyPos,
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
