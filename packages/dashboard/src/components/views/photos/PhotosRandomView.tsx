import React, { useEffect, useState, useCallback, useRef } from 'react';
import type { PhotoEntry } from '@heimdall/shared';
import type { PhotosRandomSavedState, ViewInternalSettings } from '../../../app/internalSettings';
import { setCurrentPhotoId } from './currentPhotoId';
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

  const { __savedState, __onStateChange } = settings as ViewInternalSettings;

  // Capture savedState and callback once at mount — refs stay stable across re-renders
  const savedStateRef = useRef(
    __savedState?.__view === 'photos-random' ? (__savedState as PhotosRandomSavedState) : undefined
  );
  const onStateChangeRef = useRef(__onStateChange);

  const fetchPhoto = useCallback(async () => {
    try {
      const res = await fetch(`/api/photos/random${queryParam}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.photo) {
        setPhoto(data.photo);
        setCurrentPhotoId(data.photo.id);
        onStateChangeRef.current?.({ __view: 'photos-random', photo: data.photo });
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
      const saved = savedStateRef.current.photo;
      setPhoto(saved);
      setCurrentPhotoId(saved.id);
      onStateChangeRef.current?.({ __view: 'photos-random', photo: saved });
      setLoading(false);
      return;
    }
    fetchPhoto();
  }, [fetchPhoto]);

  if (loading) return <div className={styles.container} />;
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
