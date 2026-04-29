import React, { useEffect, useState } from 'react';
import type { PhotoEntry, MemoriesResponse } from '@heimdall/shared';

interface PhotosMemoriesViewProps {
  settings: Record<string, unknown>;
}

/** "On this day" memories view — shows photos from this date in past years */
export function PhotosMemoriesView({ settings }: PhotosMemoriesViewProps): React.ReactElement {
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
        if (!cancelled) {
          setMemories(data.memories);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }
    fetchMemories();
    // Refresh every 30 minutes
    const interval = setInterval(fetchMemories, 30 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [queryParam]);

  // Flatten all memories into a slideshow list
  const allEntries = Object.entries(memories).sort((a, b) => {
    // Sort by years ago (extract number)
    const aNum = parseInt(a[0].match(/\d+/)?.[0] || '0', 10);
    const bNum = parseInt(b[0].match(/\d+/)?.[0] || '0', 10);
    return aNum - bNum;
  });

  // Build flat list: each item = { label, photo }
  const slides: { label: string; photo: PhotoEntry }[] = [];
  for (const [label, photos] of allEntries) {
    for (const photo of photos) {
      slides.push({ label, photo });
    }
  }

  // Cycle through slides every 8 seconds
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setActiveMemory((prev) => (prev + 1) % slides.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (loading) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', background: '#111' }}>
        Loading memories…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', background: '#111' }}>
        Photos unavailable
      </div>
    );
  }

  if (slides.length === 0) {
    const today = new Date();
    const dateStr = today.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });
    return (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: '#111', color: '#fff',
      }}>
        <div style={{ fontSize: '3vw', fontWeight: 700, marginBottom: '1vw' }}>Heute, {dateStr}</div>
        <div style={{ fontSize: '2vw', color: '#666' }}>Keine Erinnerungen für heute</div>
      </div>
    );
  }

  const current = slides[activeMemory % slides.length];
  const photoDate = new Date(current.photo.dateTaken);
  const dateStr = photoDate.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div
      data-testid="photos-memories-view"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: '#000',
        overflow: 'hidden',
      }}
    >
      {/* Photo */}
      <img
        key={current.photo.id}
        src={current.photo.url}
        alt={current.photo.filename}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />

      {/* Gradient overlay at bottom */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '30%',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
        pointerEvents: 'none',
      }} />

      {/* Text overlay */}
      <div style={{
        position: 'absolute',
        bottom: '3vw',
        left: '4vw',
        right: '4vw',
        color: '#fff',
        textShadow: '0 2px 8px rgba(0,0,0,0.8)',
      }}>
        <div style={{ fontSize: '3vw', fontWeight: 700, marginBottom: '0.5vw' }}>
          {current.label}
        </div>
        <div style={{ fontSize: '1.8vw', color: 'rgba(255,255,255,0.8)' }}>
          {dateStr}
        </div>
        {slides.length > 1 && (
          <div style={{ fontSize: '1.2vw', color: 'rgba(255,255,255,0.5)', marginTop: '0.5vw' }}>
            {(activeMemory % slides.length) + 1} / {slides.length}
          </div>
        )}
      </div>
    </div>
  );
}
