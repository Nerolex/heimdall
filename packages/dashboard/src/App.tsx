import React from 'react';
import { ViewRenderer } from './components/shared/ViewRenderer';
import { LoadingScreen } from './components/shared/LoadingScreen';
import { PreloadView } from './components/shared/PreloadView';
import { EmptyState } from './components/shared/EmptyState';
import { ErrorState } from './components/shared/ErrorState';
import { Overlay } from './components/overlay/Overlay';
import { KeepAwake } from './components/keepawake';
import { getDetailComponent } from './components/registry';
import { useDashboardConfig } from './app/useDashboardConfig';
import { useViewCycle } from './app/useViewCycle';
import { deriveActiveView } from './app/deriveActiveView';

export function App(): React.ReactElement {
  const { state, config, errorMessage } = useDashboardConfig();
  const {
    activeViewIndex,
    historyPos,
    nextViewIndex,
    detailMode,
    visible,
    clockVisible,
    weatherVisible,
    hasOverlay,
    handleNavClick,
    handleDetailClose,
    withInternalSettings,
  } = useViewCycle(config, (type) => !!getDetailComponent(type));

  if (state === 'loading') return <LoadingScreen />;
  if (state === 'empty') return <EmptyState />;
  if (state === 'error' || !config) return <ErrorState message={errorMessage} />;

  const { view, nextView, shouldPreloadNext, DetailComponent, baseSettings, activeSettings } =
    deriveActiveView(config, activeViewIndex, nextViewIndex, detailMode, withInternalSettings);

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
      <KeepAwake mode={config.keepAwake} />
      {DetailComponent && (
        <DetailComponent settings={activeSettings} onClose={handleDetailClose} />
      )}
      <Overlay
        clockVisible={clockVisible}
        weatherVisible={weatherVisible}
        weatherConfig={config.weather}
        showFullscreenButton={config.showFullscreenButton}
      />
      <div
        style={{
          width: '100%',
          height: '100%',
          opacity: visible ? 1 : 0,
          transition: 'opacity 1000ms ease-in-out',
        }}
      >
        <ViewRenderer key={historyPos} type={view.type} settings={activeSettings} />
      </div>
      {shouldPreloadNext && nextView && <PreloadView config={config} view={nextView} />}
    </div>
  );
}
