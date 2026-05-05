import React, { useEffect, useState } from 'react';
import type { PhotoEntry, MemoriesResponse } from '@heimdall/shared';
import styles from './Photos.module.css';

interface Props {
  settings: Record<string, unknown>;
}

export function PhotosMemoriesView({ settings }: Props): React.ReactElement {
  const [memories, setMemories] = useState<Record<string, PhotoEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeMemory, setActiveMemory] = useState(0);

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
    const interval = setInterval(fetchMemories, 30 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [queryParam]);

  // Flatten into slideshow
  const slides: { label: string; photo: PhotoEntry }[] = [];
  const sorted = Object.entries(memories).sort((a, b) => {
    const aNum = parseInt(a[0].match(/\d+/)?.[0] || '0', 10);
    const bNum = parseInt(b[0].match(/\d+/)?.[0] || '0', 10);
    return aNum - bNum;
  });
  for (const [label, photos] of sorted) {
    for (const photo of photos) slides.push({ label, photo });
  }

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => setActiveMemory((prev) => (prev + 1) % slides.length), 8000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (loading) return <div className={styles.loading}>Loading memories…</div>;
  if (error) return <div className={styles.loading}>Photos unavailable</div>;

  if (slides.length === 0) {
    const dateStr = new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyTitle}>Heute, {dateStr}</div>
        <div className={styles.emptySubtitle}>Keine Erinnerungen für heute</div>
      </div>
    );
  }

  const current = slides[activeMemory % slides.length];
  const dateStr = new Date(current.photo.dateTaken).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className={styles.container} data-testid="photos-memories-view">
      <img key={`bg-${current.photo.id}`} src={current.photo.url} alt="" className={styles.blurredBg} />
      <img key={current.photo.id} src={current.photo.url} alt={current.photo.filename} className={styles.photo} />
      <div className={styles.memoriesGradient} />
      <div className={styles.memoriesText}>
        <div className={styles.memoriesLabel}>{current.label}</div>
        <div className={styles.memoriesDate}>{dateStr}</div>
        {slides.length > 1 && (
          <div className={styles.memoriesCounter}>{(activeMemory % slides.length) + 1} / {slides.length}</div>
        )}
      </div>
    </div>
  );
}
