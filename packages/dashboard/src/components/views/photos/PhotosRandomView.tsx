import React, { useEffect, useState, useCallback, useRef } from 'react';
import type { PhotoEntry } from '@heimdall/shared';
import styles from './Photos.module.css';

interface Props {
  settings: Record<string, unknown>;
}

export function PhotosRandomView({ settings }: Props): React.ReactElement {
  const [photo, setPhoto] = useState<PhotoEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const dir = settings.dir as string | undefined;
  const queryParam = dir ? `?dir=${encodeURIComponent(dir)}` : '';

  // Capture savedState and callback once at mount — refs stay stable across re-renders
  const savedStateRef = useRef(settings.__savedState as { photo: PhotoEntry } | undefined);
  const onStateChangeRef = useRef(settings.__onStateChange as ((s: unknown) => void) | undefined);

  const fetchPhoto = useCallback(async () => {
    try {
      const res = await fetch(`/api/photos/random${queryParam}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.photo) {
        setPhoto(data.photo);
        onStateChangeRef.current?.({ photo: data.photo });
      }
      setLoading(false);
    } catch {
      setError(true);
      setLoading(false);
    }
  }, [queryParam]);

  useEffect(() => {
    // Restore previously shown photo when navigating back
    if (savedStateRef.current?.photo) {
      setPhoto(savedStateRef.current.photo);
      onStateChangeRef.current?.({ photo: savedStateRef.current.photo });
      setLoading(false);
      return;
    }
    fetchPhoto();
  }, [fetchPhoto]);

  if (loading) return <div className={styles.loading}>Loading photo…</div>;
  if (error || !photo) return <div className={styles.loading}>{error ? 'Photos unavailable' : 'No photos found'}</div>;

  const dateStr = new Date(photo.dateTaken).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className={styles.container} data-testid="photos-random-view">
      <img src={photo.url} alt="" className={styles.blurredBg} />
      <img src={photo.url} alt={photo.filename} className={styles.photo} />
      <div className={styles.randomGradient} />
      <div className={styles.randomDate}>{dateStr}</div>
    </div>
  );
}
