import React, { useEffect, useState, useCallback, useRef } from 'react';
import type { PhotoEntry } from '@heimdall/shared';
import type { PhotosRandomSavedState, ViewInternalSettings } from '../../../app/internalSettings';
import { setCurrentPhotoId } from './currentPhotoId';
import styles from './Photos.module.css';

interface Props {
  settings: Record<string, unknown>;
}

export function PhotosRandomView({ settings }: Props): React.ReactElement {
  const [error, setError] = useState(false);

  const dir = settings.dir as string | undefined;
  const queryParam = dir ? `?dir=${encodeURIComponent(dir)}` : '';

  const { __savedState, __onStateChange } = settings as ViewInternalSettings;

  // Capture savedState and callback once at mount — refs stay stable across re-renders
  const savedStateRef = useRef(
    __savedState?.__view === 'photos-random' ? (__savedState as PhotosRandomSavedState) : undefined
  );
  const onStateChangeRef = useRef(__onStateChange);

  // Initialise directly from savedState so there's no blank-frame flash on back-navigation
  const [photo, setPhoto] = useState<PhotoEntry | null>(savedStateRef.current?.photo ?? null);
  const [loading, setLoading] = useState(!savedStateRef.current?.photo);

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
    // savedState already set as initial state — just register it and skip fetch
    if (savedStateRef.current?.photo) {
      const saved = savedStateRef.current.photo;
      setCurrentPhotoId(saved.id);
      onStateChangeRef.current?.({ __view: 'photos-random', photo: saved });
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
      <div className={styles.randomMeta}>
        {photo.location && <div className={styles.randomLocation}>{photo.location}</div>}
        <div className={styles.randomDate}>{dateStr}</div>
      </div>
    </div>
  );
}
