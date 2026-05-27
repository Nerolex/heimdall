import React from 'react';
import { ViewRenderer } from './components/shared/ViewRenderer';
import { EmptyState } from './components/shared/EmptyState';
import { ErrorState } from './components/shared/ErrorState';
import { Overlay } from './components/overlay/Overlay';
import { KeepAwake } from './components/keepawake';
import { getDetailComponent } from './components/registry';
import { useDashboardConfig } from './app/useDashboardConfig';
import { useViewCycle } from './app/useViewCycle';
import { mergeViewSettings } from './app/viewSettings';

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

  if (state === 'error' || !config) {
    return <ErrorState message={errorMessage} />;
  }

  const view = config.views[activeViewIndex];
  const nextView = nextViewIndex != null ? config.views[nextViewIndex] : null;
  const shouldPreloadNext = nextView && nextView.type !== view.type;
  const DetailComponent = detailMode ? getDetailComponent(view.type) : null;
  const baseSettings = mergeViewSettings(config, view);
  const activeSettings = withInternalSettings(baseSettings);
  const keepAwakeMode = (config as unknown as Record<string, unknown>).keepAwake as boolean | 'auto' | undefined;

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
      <KeepAwake mode={keepAwakeMode} />
      {DetailComponent && (
        <DetailComponent settings={baseSettings} onClose={handleDetailClose} />
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
      {shouldPreloadNext && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            pointerEvents: 'none',
            zIndex: -1,
          }}
        >
          <ViewRenderer type={nextView.type} settings={mergeViewSettings(config, nextView)} />
        </div>
      )}
    </div>
  );
}
