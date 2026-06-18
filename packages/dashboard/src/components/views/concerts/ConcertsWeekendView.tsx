import React, { useMemo, useRef } from 'react';
import type { ConcertsViewSnapshot, GroupedListItem } from '@heimdall/shared';
import { withActiveProfile } from '../../../app/apiProfile';
import { useViewSnapshot } from '../../../hooks/useViewSnapshot';
import type { ViewInternalSettings, ViewSavedState } from '../../../app/internalSettings';
import { GroupedListView } from '../shared/GroupedListView';

export function ConcertsWeekendView({ settings }: { settings: Record<string, unknown> }) {
  const { data: snapshot, status } = useViewSnapshot<ConcertsViewSnapshot>(
    () => withActiveProfile('/api/showcase/snapshot?source=concerts'),
  );
  const skipIfEmpty = settings.skipIfEmpty !== false;
  const { __onEmpty, __onStateChange, __savedState } = settings as ViewInternalSettings;

  const concerts = snapshot?.concerts ?? [];

  const savedStateRef = useRef(__savedState);
  const onStateChangeRef = useRef(__onStateChange as ((s: ViewSavedState) => void) | undefined);

  const bgImage = useMemo(() => {
    if (savedStateRef.current != null) {
      const s = savedStateRef.current as { bgImageUrl?: string } | undefined;
      return s?.bgImageUrl;
    }
    const withImage = concerts.filter(c => c.plexArt || c.plexThumb || c.artistMbid);
    if (withImage.length === 0) return undefined;
    const picked = withImage[Math.floor(Math.random() * withImage.length)];
    const artPath = picked.plexArt || picked.plexThumb;
    const imgUrl = artPath
      ? `/api/plex/thumb?path=${encodeURIComponent(artPath)}`
      : picked.artistMbid
        ? `/api/concerts/artist-image/${picked.artistMbid}`
        : undefined;
    if (imgUrl) {
      onStateChangeRef.current?.({ __view: 'concerts-weekend', bgImageUrl: imgUrl } as ViewSavedState);
    }
    return imgUrl;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot?.refreshedAt]);

  const items: GroupedListItem[] = useMemo(
    () => concerts.map(c => ({
      id: c.id,
      title: c.artistName,
      categoryLabel: '🎵 Concert',
      date: c.date,
      dateDisplay: c.dateDisplay,
      timeDisplay: c.distanceKm !== null ? `${Math.round(c.distanceKm)} km` : null,
      venue: c.venue ? `${c.venue}${c.city ? `, ${c.city}` : ''}` : null,
    })),
    [concerts],
  );

  return (
    <GroupedListView
      items={items}
      status={status}
      bgImageUrl={bgImage}
      skipIfEmpty={skipIfEmpty}
      onEmpty={__onEmpty}
      fallbackBackground={
        'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
      }
    />
  );
}
