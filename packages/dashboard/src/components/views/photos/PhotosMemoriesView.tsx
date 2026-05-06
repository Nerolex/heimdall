import React, { useEffect, useState, useMemo } from 'react';
import type { PhotoEntry, MemoriesResponse } from '@heimdall/shared';
import styles from './Photos.module.css';

interface Props {
  settings: Record<string, unknown>;
}

export function PhotosMemoriesView({ settings }: Props): React.ReactElement {
  const [memories, setMemories] = useState<Record<string, PhotoEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const dir = settings.dir as string | undefined;
  const queryParam = dir ? `?dir=${encodeURIComponent(dir)}` : '';

  useEffect(() => {
    let cancelled = false;
    async function fetchMemories(): Promise<void> {
      try {
        const res = await fetch(`/api/photos/memories${queryParam}`);
        if (!res.ok) throw new Error();
        const data: MemoriesResponse = await res.json();
        if (!cancelled) { setMemories(data.memories); setLoading(false); }
      } catch {
        if (!cancelled) { setError(true); setLoading(false); }
      }
    }
    fetchMemories();
    return () => { cancelled = true; };
  }, [queryParam]);

  // Pick one random memory, stable across re-renders
  const current = useMemo(() => {
    const slides: { label: string; photo: PhotoEntry }[] = [];
    for (const [label, photos] of Object.entries(memories)) {
      for (const photo of photos) slides.push({ label, photo });
    }
    if (slides.length === 0) return null;
    return slides[Math.floor(Math.random() * slides.length)];
  }, [memories]);

  if (loading) return <div className={styles.loading}>Loading memories…</div>;
  if (error) return <div className={styles.loading}>Photos unavailable</div>;

  if (!current) {
    const dateStr = new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyTitle}>Heute, {dateStr}</div>
        <div className={styles.emptySubtitle}>Keine Erinnerungen für heute</div>
      </div>
    );
  }

  const dateStr = new Date(current.photo.dateTaken).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className={styles.container} data-testid="photos-memories-view">
      <img src={current.photo.url} alt="" className={styles.blurredBg} />
      <img src={current.photo.url} alt={current.photo.filename} className={styles.photo} />
      <div className={styles.memoriesGradient} />
      <div className={styles.memoriesText}>
        <div className={styles.memoriesLabel}>{current.label}</div>
        <div className={styles.memoriesDate}>{dateStr}</div>
      </div>
    </div>
  );
}
