import React from 'react';
import type { GroupedListItem } from '@heimdall/shared';
import { useViewSkipEffect } from '../../../hooks/useViewSkipEffect';
import type { SnapshotStatus } from '../../../hooks/useViewSnapshot';
import s from './grouped-list.module.css';
import showcaseStyles from './showcase.module.css';

interface GroupedListViewProps {
  items: GroupedListItem[];
  status: SnapshotStatus;
  bgImageUrl?: string | null;
  skipIfEmpty: boolean;
  onEmpty?: () => void;
  emptyMessage?: string;
  staleMessage?: string;
  /** Background gradient for empty/loading state (defaults to dark blue). */
  fallbackBackground?: string;
}

export function GroupedListView({
  items,
  status,
  bgImageUrl,
  skipIfEmpty,
  onEmpty,
  emptyMessage = 'Keine Daten',
  staleMessage = 'Zwischengespeicherte Daten',
  fallbackBackground,
}: GroupedListViewProps): React.ReactElement | null {
  useViewSkipEffect(status, skipIfEmpty, onEmpty);

  if (status === 'loading' || status === 'error' || status === 'empty' || items.length === 0) {
    return (
      <div
        className={s.groupedContainer}
        style={fallbackBackground ? { background: fallbackBackground } : undefined}
      >
        <div className={showcaseStyles.showcaseFallback}>
          {(status === 'empty' || items.length === 0) && emptyMessage ? (
            <p className={showcaseStyles.emptyMessage}>{emptyMessage}</p>
          ) : null}
        </div>
      </div>
    );
  }

  // Group by date
  const groups = new Map<string, typeof items>();
  for (const item of items) {
    const existing = groups.get(item.date) ?? [];
    existing.push(item);
    groups.set(item.date, existing);
  }

  return (
    <div className={s.groupedContainer}>
      {bgImageUrl && (
        <div className={s.groupedBg} style={{ backgroundImage: `url(${bgImageUrl})` }} />
      )}
      <div className={s.groupedBgOverlay} />
      <div className={s.cardList}>
        {status === 'stale' && <div className={s.staleBanner}>{staleMessage}</div>}
        {Array.from(groups.entries()).map(([, dayItems]) => (
          <div key={dayItems[0].date} className={s.dayGroup}>
            <div className={s.dayHeader}>{dayItems[0].dateDisplay}</div>
            {dayItems.map(item => (
              <div key={item.id} className={s.row}>
                <span className={s.rowTime}>{item.timeDisplay ? `${item.timeDisplay} Uhr` : ''}</span>
                <div className={s.rowBody}>
                  <span className={s.rowTitle}>{item.title}</span>
                  {item.venue && <span className={s.rowVenue}>📍 {item.venue}</span>}
                </div>
                {item.categoryLabel && (
                  <span className={s.rowCat}>{item.categoryLabel}</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
