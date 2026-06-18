import React, { useCallback, useMemo } from 'react';
import QRCode from 'react-qr-code';
import type { ConcertRecord, EventRecord, ShowcaseItem } from '@heimdall/shared';
import { withActiveProfile } from '../../../app/apiProfile';
import { useViewSnapshot } from '../../../hooks/useViewSnapshot';
import { useViewRotation } from '../../../hooks/useViewRotation';
import { useViewSkipEffect } from '../../../hooks/useViewSkipEffect';
import type { ViewInternalSettings, ViewSavedState, ConcertsShowcaseSavedState, EventsShowcaseSavedState } from '../../../app/internalSettings';
import concertsStyles from '../concerts/Concerts.module.css';
import eventsStyles from '../events/Events.module.css';
import s from './showcase.module.css';

type ShowcaseSource = 'concerts' | 'events-today' | 'events-upcoming';

interface ShowcaseViewProps {
  source: ShowcaseSource;
  days?: number;
  skipIfEmpty: boolean;
  internalSettings: ViewInternalSettings;
}

// ── Adapters ──

function concertToShowcaseItem(c: ConcertRecord): ShowcaseItem {
  const artPath = c.plexArt || c.plexThumb;
  const backgroundUrl = artPath
    ? `/api/plex/thumb?path=${encodeURIComponent(artPath)}`
    : c.artistMbid
      ? `/api/concerts/artist-image/${c.artistMbid}`
      : null;

  return {
    id: c.id,
    title: c.artistName,
    venue: c.venue ? `${c.venue}, ${c.city}` : null,
    dateDisplay: c.dateDisplay,
    detailUrl: c.eventUrl || c.lastFmUrl || `https://www.setlist.fm/search?query=${encodeURIComponent(c.artistName)}`,
    categoryLabel: '🎵 Concert',
    backgroundUrl,
    extraLine: c.distanceKm !== null ? `${Math.round(c.distanceKm)} km` : null,
    city: c.city,
  };
}

function eventToShowcaseItem(e: EventRecord): ShowcaseItem {
  return {
    id: e.id,
    title: e.title,
    venue: e.venue,
    dateDisplay: e.dateDisplay,
    timeDisplay: e.startTime ?? undefined,
    detailUrl: e.detailUrl,
    categoryLabel: e.categoryLabel,
    backgroundUrl: e.imageUrl ?? null,
    extraLine: null,
    city: e.city,
  };
}

// ── Source config ──

interface SourceConfig {
  styles: { readonly [key: string]: string };
  distanceClass?: string;
  buildUrl: () => string;
  cacheKey?: string;
  refreshIntervalMs?: number;
  mapItems: (data: unknown) => ShowcaseItem[];
  savedToRotation: (s: ViewSavedState | undefined) => { id?: string; index?: number } | undefined;
  rotationToSaved: (state: { id?: string; index?: number }) => ViewSavedState;
  rotationOptions: { intervalMs?: number; mountKey?: string };
  viewTag: string;
  emptyMsg: string;
  errorMsg: string;
}

function buildSourceConfig(
  source: ShowcaseSource,
  days: number | undefined,
): SourceConfig {
  const viewType = source;
  const isConcerts = source === 'concerts';

  const styles = isConcerts ? concertsStyles : eventsStyles;
  const emptyMsg = isConcerts ? 'Keine Konzerte gefunden' : 'Keine Events gefunden';
  const errorMsg = isConcerts ? 'Fehler beim Laden der Konzerte' : 'Fehler beim Laden der Events';

  if (isConcerts) {
    return {
      styles,
      distanceClass: styles.distance,
      buildUrl: () => withActiveProfile('/api/showcase/snapshot?source=concerts'),
      refreshIntervalMs: 30 * 60 * 1000,
      mapItems: (data) => {
        const d = data as { concerts?: ConcertRecord[] };
        return (d.concerts ?? []).map(concertToShowcaseItem);
      },
      savedToRotation: (s) => {
        if (s?.__view === 'concerts-upcoming') {
          const cs = s as ConcertsShowcaseSavedState;
          return { id: cs.__lastConcertId };
        }
        return undefined;
      },
      rotationToSaved: (state) => ({
        __view: 'concerts-upcoming',
        __lastConcertId: state.id,
        __lastRotation: Date.now(),
      } as ConcertsShowcaseSavedState),
      rotationOptions: { intervalMs: 30000 },
      viewTag: 'concerts-upcoming-view',
      emptyMsg,
      errorMsg,
    };
  }

    return {
      styles,
      distanceClass: undefined,
      buildUrl: () => withActiveProfile(`/api/showcase/snapshot?source=${encodeURIComponent(viewType)}${days != null ? `&days=${days}` : ''}`),
    cacheKey: `events-${viewType}-${days ?? ''}`,
    mapItems: (data) => {
      const d = data as { events?: EventRecord[] };
      return (d.events ?? []).map(eventToShowcaseItem);
    },
    savedToRotation: (s) => {
      if (s?.__view === viewType) {
        const es = s as EventsShowcaseSavedState;
        return { index: es.activeIndex };
      }
      return undefined;
    },
    rotationToSaved: (state) => ({
      __view: viewType,
      activeIndex: state.index ?? 0,
    } as EventsShowcaseSavedState),
    rotationOptions: { mountKey: viewType, intervalMs: 0 },
    viewTag: `${viewType}-view`,
    emptyMsg,
    errorMsg,
  };
}

// ── Component ──

export function ShowcaseView({
  source,
  days,
  skipIfEmpty,
  internalSettings,
}: ShowcaseViewProps): React.ReactElement | null {
  const { __onEmpty, __onStateChange, __savedState } = internalSettings;

  const cfg = useMemo(() => buildSourceConfig(source, days), [source, days]);

  const { data: snapshot, status } = useViewSnapshot(
    cfg.buildUrl,
    { cacheKey: cfg.cacheKey, refreshIntervalMs: cfg.refreshIntervalMs },
  );

  const items = useMemo(() => (snapshot ? cfg.mapItems(snapshot) : []), [snapshot, cfg]);

  const mappedSavedState = useMemo(() => cfg.savedToRotation(__savedState), [cfg, __savedState]);

  const wrappedOnStateChange = useCallback(
    (state: Record<string, unknown>) => {
      if (__onStateChange) {
        __onStateChange(cfg.rotationToSaved({ id: (state as { id?: string }).id, index: (state as { index?: number }).index }));
      }
    },
    [cfg, __onStateChange],
  );

  const activeIndex = useViewRotation(
    items,
    source,
    mappedSavedState,
    wrappedOnStateChange as ((state: Record<string, unknown>) => void) | undefined,
    undefined,
    cfg.rotationOptions,
  );

  useViewSkipEffect(status, skipIfEmpty, __onEmpty);

  if (status === 'loading' || status === 'error' || status === 'empty' || items.length === 0) {
    return (
      <div className={cfg.styles.showcaseContainer}>
        <div className={s.showcaseFallback}>
          {status === 'empty' && <p className={s.emptyMessage}>{cfg.emptyMsg}</p>}
          {status === 'error' && <p className={s.errorMessage}>{cfg.errorMsg}</p>}
        </div>
      </div>
    );
  }

  const item = items[activeIndex] ?? items[0];
  if (!item) return <div className={cfg.styles.showcaseContainer} />;

  return (
    <div className={cfg.styles.showcaseContainer} data-testid={cfg.viewTag}>
      {item.backgroundUrl && (
        <img
          src={item.backgroundUrl}
          alt=""
          className={s.showcaseBackground}
          onError={(e) => e.currentTarget.style.display = 'none'}
        />
      )}
      {!item.backgroundUrl && <div className={s.showcaseFallback} />}
      <div className={s.showcaseGradient} />
      <div className={s.showcaseOverlay}>
        <div className={s.showcaseQr}>
          <QRCode
            value={item.detailUrl}
            size={256}
            bgColor="transparent"
            fgColor="#ffffff"
            style={{ width: '100%', height: '100%' }}
          />
        </div>
        <div className={s.showcaseInfo}>
          {item.categoryLabel && (
            <span className={s.showcaseCategoryBadge}>{item.categoryLabel}</span>
          )}
          <div className={s.showcaseTitle}>{item.title}</div>
          {item.venue && (
            <div className={s.showcaseVenue}>
              <span className={s.showcaseVenueIcon}>📍</span>{item.venue}
              {item.extraLine && cfg.distanceClass && (
                <span className={cfg.distanceClass}> • {item.extraLine}</span>
              )}
            </div>
          )}
          <div className={s.showcaseDateTime}>
            {item.dateDisplay}{item.timeDisplay ? ` · ${item.timeDisplay} Uhr` : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
