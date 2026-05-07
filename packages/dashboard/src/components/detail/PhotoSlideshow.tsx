import React, { useEffect, useState, useRef } from 'react';
import { clockCurrentPhotoId } from '../views/clock';
import styles from './Detail.module.css';

interface Props {
  settings: Record<string, unknown>;
  onClose: () => void;
}

interface PhotoData {
  url: string;
  id: string;
  filename: string;
  dateTaken: string;
}

const SLIDE_INTERVAL = 6000;
const FADE_DURATION = 1000;

/**
 * Timeline slideshow: shows photos around a center photo sorted by date.
 * Uses the same fade-out → swap → fade-in transition as the dashboard.
 */
export function PhotoSlideshow({ settings, onClose }: Props): React.ReactElement {
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const isTransitioning = useRef(false);
  const cycleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const timelineCount = (settings.timelineCount as number) || 5;
  const dir = settings.dir as string | undefined;

  useEffect(() => {
    let cancelled = false;
    async function fetchTimeline(): Promise<void> {
      try {
        const photoId = clockCurrentPhotoId;
        let url: string;

        if (photoId) {
          // Fetch timeline around the clock's current photo
          const dirParam = dir ? `&dir=${encodeURIComponent(dir)}` : '';
          url = `/api/photos/timeline?id=${photoId}&count=${timelineCount}${dirParam}`;
        } else {
          // Fallback: random photos
          const dirParam = dir ? `&dir=${encodeURIComponent(dir)}` : '';
          url = `/api/photos/random?count=${timelineCount * 2 + 1}${dirParam}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error();
        const data = await res.json();

        if (!cancelled) {
          if (data.photos && data.photos.length > 0) {
            setPhotos(data.photos);
            setActiveIndex(data.centerIndex ?? Math.floor(data.photos.length / 2));
          } else if (data.photo) {
            setPhotos([data.photo]);
            setActiveIndex(0);
          }
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    fetchTimeline();
    return () => { cancelled = true; };
  }, [timelineCount, dir]);

  function transitionTo(nextIdx: number): void {
    if (isTransitioning.current) return;
    isTransitioning.current = true;
    setVisible(false);
    setTimeout(() => {
      setActiveIndex(nextIdx);
      setVisible(true);
      isTransitioning.current = false;
    }, FADE_DURATION);
  }

  function goTo(direction: number): void {
    if (photos.length <= 1) return;
    const nextIdx = (activeIndex + direction + photos.length) % photos.length;
    transitionTo(nextIdx);
  }

  function scheduleCycle(): void {
    if (cycleTimer.current) clearTimeout(cycleTimer.current);
    if (photos.length <= 1) return;
    cycleTimer.current = setTimeout(() => {
      const nextIdx = (activeIndex + 1) % photos.length;
      transitionTo(nextIdx);
      scheduleCycle();
    }, SLIDE_INTERVAL);
  }

  useEffect(() => {
    if (photos.length <= 1) return;
    scheduleCycle();
    return () => {
      if (cycleTimer.current) clearTimeout(cycleTimer.current);
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
      scheduleCycle();
    } else if (x > 0.7) {
      goTo(1);
      scheduleCycle();
    }
  }

  const current = photos[activeIndex];
  const dateStr = new Date(current.dateTaken).toLocaleDateString('de-DE', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className={styles.container} onClick={handleSlideshowClick}>
      <div
        style={{
          width: '100%',
          height: '100%',
          opacity: visible ? 1 : 0,
          transition: `opacity ${FADE_DURATION}ms ease-in-out`,
        }}
      >
        <img src={current.url} alt="" className={styles.blurredBg} />
        <img src={current.url} alt={current.filename} className={styles.photo} />
      </div>
      <div className={styles.dotBar}>
        {photos.map((_, i) => (
          <span
            key={i}
            className={i === activeIndex ? styles.dotActive : styles.dot}
            onClick={(e) => { e.stopPropagation(); if (i !== activeIndex) { transitionTo(i); scheduleCycle(); } }}
          />
        ))}
      </div>
      <span className={styles.infoDate}>{dateStr}</span>
      <button className={styles.closeButton} onClick={(e) => { e.stopPropagation(); onClose(); }}>✕</button>
    </div>
  );
}
