import React, { useEffect, useState, useRef } from 'react';
import styles from './Detail.module.css';

interface Props {
  settings: Record<string, unknown>;
  onClose: () => void;
}

interface PhotoData {
  url: string;
  filename: string;
  dateTaken: string;
}

const SLIDE_INTERVAL = 6000;
const FADE_DURATION = 1000;

export function PhotoSlideshow({ settings, onClose }: Props): React.ReactElement {
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState<number | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const count = (settings.slideshowCount as number) || 20;
  const mode = (settings.slideshowMode as string) || 'random';
  const dir = settings.dir as string | undefined;

  useEffect(() => {
    let cancelled = false;
    async function fetchPhotos(): Promise<void> {
      try {
        const queryParam = dir ? `&dir=${encodeURIComponent(dir)}` : '';
        const res = await fetch(`/api/photos/random?count=${count}${queryParam}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        const list = data.photos || (data.photo ? [data.photo] : []);
        if (!cancelled && list.length > 0) {
          if (mode === 'chronological') {
            list.sort((a: PhotoData, b: PhotoData) =>
              new Date(a.dateTaken).getTime() - new Date(b.dateTaken).getTime()
            );
          }
          setPhotos(list);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    fetchPhotos();
    return () => { cancelled = true; };
  }, [count, mode, dir]);

  function goTo(direction: number): void {
    if (photos.length <= 1 || transitioning) return;
    const target = (activeIndex + direction + photos.length) % photos.length;
    setNextIndex(target);
    setTransitioning(true);
    timerRef.current = setTimeout(() => {
      setActiveIndex(target);
      setNextIndex(null);
      setTransitioning(false);
    }, FADE_DURATION);
  }

  // Auto-advance slideshow
  function resetSlideTimer(): void {
    if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
    if (photos.length <= 1) return;
    slideTimerRef.current = setTimeout(() => goTo(1), SLIDE_INTERVAL);
  }

  useEffect(() => {
    if (photos.length <= 1) return;
    resetSlideTimer();
    return () => {
      if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [photos, activeIndex]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading slideshow…</div>
        <button className={styles.closeButton} onClick={onClose}>✕</button>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>No photos available</div>
        <button className={styles.closeButton} onClick={onClose}>✕</button>
      </div>
    );
  }

  function handleSlideshowClick(e: React.MouseEvent<HTMLDivElement>): void {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    if (x < 0.3) {
      goTo(-1);
      resetSlideTimer();
    } else if (x > 0.7) {
      goTo(1);
      resetSlideTimer();
    }
  }

  const current = photos[activeIndex];
  const next = nextIndex != null ? photos[nextIndex] : null;
  const dateStr = new Date(current.dateTaken).toLocaleDateString('de-DE', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className={styles.container} onClick={handleSlideshowClick}>
      <img src={current.url} alt="" className={styles.blurredBg} />
      {/* Current photo — fades out during transition */}
      <img
        src={current.url}
        alt={current.filename}
        className={styles.photo}
        style={{
          opacity: transitioning ? 0 : 1,
          transition: `opacity ${FADE_DURATION}ms ease-in-out`,
          zIndex: 1,
        }}
      />
      {/* Next photo — fades in during transition */}
      {next && (
        <img
          src={next.url}
          alt={next.filename}
          className={styles.photo}
          style={{
            opacity: transitioning ? 1 : 0,
            transition: `opacity ${FADE_DURATION}ms ease-in-out`,
            zIndex: 2,
          }}
        />
      )}
      <div className={styles.infoBar}>
        <span className={styles.infoDate}>{dateStr}</span>
        <span className={styles.infoCounter}>{activeIndex + 1} / {photos.length}</span>
      </div>
      <button className={styles.closeButton} onClick={(e) => { e.stopPropagation(); onClose(); }}>✕</button>
    </div>
  );
}
