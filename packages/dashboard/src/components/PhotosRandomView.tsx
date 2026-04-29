import React, { useEffect, useState, useCallback } from 'react';
import type { PhotoEntry } from '@heimdall/shared';

interface PhotosRandomViewProps {
  settings: Record<string, unknown>;
}

/** Random photo view — displays a random photo from the collection */
export function PhotosRandomView({ settings }: PhotosRandomViewProps): React.ReactElement {
  const [photo, setPhoto] = useState<PhotoEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const dir = settings.dir as string | undefined;
  const queryParam = dir ? `?dir=${encodeURIComponent(dir)}` : '';

  const fetchPhoto = useCallback(async () => {
    try {
      const res = await fetch(`/api/photos/random${queryParam}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.photo) {
        setPhoto(data.photo);
      }
      setLoading(false);
    } catch {
      setError(true);
      setLoading(false);
    }
  }, [queryParam]);

  useEffect(() => {
    fetchPhoto();
    // Fetch a new random photo each time the view cycles back
    // (the component remounts on each cycle)
  }, [fetchPhoto]);

  if (loading) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', background: '#111' }}>
        Loading photo…
      </div>
    );
  }

  if (error || !photo) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', background: '#111' }}>
        {error ? 'Photos unavailable' : 'No photos found'}
      </div>
    );
  }

  const photoDate = new Date(photo.dateTaken);
  const dateStr = photoDate.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div
      data-testid="photos-random-view"
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
        src={photo.url}
        alt={photo.filename}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />

      {/* Subtle gradient at bottom */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '20%',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
        pointerEvents: 'none',
      }} />

      {/* Date label */}
      <div style={{
        position: 'absolute',
        bottom: '2vw',
        left: '3vw',
        color: 'rgba(255,255,255,0.7)',
        fontSize: '1.5vw',
        textShadow: '0 2px 6px rgba(0,0,0,0.8)',
      }}>
        {dateStr}
      </div>
    </div>
  );
}
