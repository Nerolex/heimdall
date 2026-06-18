import React, { useMemo, useRef } from 'react';
import type { EventsViewSnapshot, GroupedListItem } from '@heimdall/shared';
import { withActiveProfile } from '../../../app/apiProfile';
import { useViewSnapshot } from '../../../hooks/useViewSnapshot';
import type { ViewInternalSettings, EventsWeekendSavedState, ViewSavedState } from '../../../app/internalSettings';
import { GroupedListView } from '../shared/GroupedListView';
import styles from './Events.module.css';

export function EventsWeekendView({ settings }: { settings: Record<string, unknown> }) {
  const cacheKey = 'events-events-weekend-';
  const { data: snapshot, status } = useViewSnapshot<EventsViewSnapshot>(
    () => withActiveProfile('/api/showcase/snapshot?source=events-weekend'),
    { cacheKey }
  );
  const skipIfEmpty = settings.skipIfEmpty !== false;
  const { __onEmpty, __onStateChange, __savedState } = settings as ViewInternalSettings;

  const events = snapshot?.events ?? [];

  const savedStateRef = useRef(
    __savedState?.__view === 'events-weekend' ? (__savedState as EventsWeekendSavedState) : undefined
  );
  const onStateChangeRef = useRef(__onStateChange as ((s: ViewSavedState) => void) | undefined);

  const bgImage = useMemo(() => {
    if (savedStateRef.current != null) return savedStateRef.current.bgImageUrl;
    const withImage = events.filter(e => e.imageUrl);
    const picked = withImage.length
      ? withImage[Math.floor(Math.random() * withImage.length)].imageUrl
      : undefined;
    if (picked !== undefined) {
      onStateChangeRef.current?.({ __view: 'events-weekend', bgImageUrl: picked });
    }
    return picked;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot?.refreshedAt]);

  const items: GroupedListItem[] = useMemo(
    () => events.map(e => ({
      id: e.id,
      title: e.title,
      categoryLabel: e.categoryLabel,
      date: e.date,
      dateDisplay: e.dateDisplay,
      timeDisplay: e.startTime,
      venue: e.venue,
      imageUrl: e.imageUrl,
    })),
    [events],
  );

  return (
    <GroupedListView
      items={items}
      status={status}
      bgImageUrl={bgImage}
      skipIfEmpty={skipIfEmpty}
      onEmpty={__onEmpty}
    />
  );
}
