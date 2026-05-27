import React, { useEffect, useState, useMemo, useRef } from 'react';
import type { PhotoEntry, MemoriesResponse } from '@heimdall/shared';
import { setCurrentPhotoId } from './currentPhotoId';
import styles from './Photos.module.css';

interface Props {
  settings: Record<string, unknown>;
}

type MemoryEntry = { label: string; photo: PhotoEntry };

export function PhotosMemoriesView({ settings }: Props): React.ReactElement {
  const [memories, setMemories] = useState<Record<string, PhotoEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const dir = settings.dir as string | undefined;
  const queryParam = dir ? `?dir=${encodeURIComponent(dir)}` : '';

  // Capture savedState and callback once at mount
  const savedStateRef = useRef(settings.__savedState as MemoryEntry | undefined);
  const onStateChangeRef = useRef(settings.__onStateChange as ((s: unknown) => void) | undefined);
  const onEmptyRef = useRef(settings.__onEmpty as (() => void) | undefined);

  useEffect(() => {
    // Skip fetch when restoring saved state (back navigation — instant restore)
    if (savedStateRef.current) {
      setLoading(false);
      return;
    }
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

  // Restore saved memory or pick randomly — stable once memories are loaded
  const current = useMemo((): MemoryEntry | null => {
    if (savedStateRef.current) return savedStateRef.current;
    const slides: MemoryEntry[] = [];
    for (const [label, photos] of Object.entries(memories)) {
      for (const photo of photos) slides.push({ label, photo });
    }
    if (slides.length === 0) return null;
    return slides[Math.floor(Math.random() * slides.length)];
  }, [memories]);

  // Save state and update current photo ID whenever current is determined
  useEffect(() => {
    if (current) {
      setCurrentPhotoId(current.photo.id);
      onStateChangeRef.current?.(current);
    }
  }, [current]);

  if (loading) return <div className={styles.container} />;
  if (error) return <div className={styles.loading}>Photos unavailable</div>;

  if (!current) {
    onEmptyRef.current?.();
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
