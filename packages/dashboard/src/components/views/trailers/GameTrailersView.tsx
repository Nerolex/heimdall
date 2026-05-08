import React, { useEffect, useState, useRef, useCallback } from 'react';
import styles from './Trailers.module.css';

interface VideoEntry {
  videoId: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
}

// How long to show each segment before picking a new random video (ms)
const SEGMENT_DURATION = 2.5 * 60 * 1000;

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomStartSec(): number {
  // Trailers are 1–3 min; start anywhere from 5s to 45s in for variety
  return 5 + Math.floor(Math.random() * 40);
}

export function GameTrailersView(): React.ReactElement {
  const [videos, setVideos] = useState<VideoEntry[]>([]);
  const [current, setCurrent] = useState<VideoEntry | null>(null);
  const [startSec, setStartSec] = useState(0);
  const [error, setError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videosRef = useRef<VideoEntry[]>([]);

  const pickNext = useCallback((pool: VideoEntry[]) => {
    const vid = pickRandom(pool);
    setCurrent(vid);
    setStartSec(randomStartSec());
  }, []);

  useEffect(() => {
    fetch('/api/youtube/gametrailers')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: { videos: VideoEntry[] }) => {
        if (!data.videos?.length) throw new Error();
        videosRef.current = data.videos;
        setVideos(data.videos);
        pickNext(data.videos);
      })
      .catch(() => setError(true));
  }, [pickNext]);

  // Auto-advance to next random video after SEGMENT_DURATION
  useEffect(() => {
    if (!current || !videos.length) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      pickNext(videosRef.current);
    }, SEGMENT_DURATION);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [current, videos.length, pickNext]);

  if (error) {
    return <div className={styles.error}>GameTrailers unavailable</div>;
  }

  if (!current) {
    return <div className={styles.loading} />;
  }

  const src = [
    `https://www.youtube.com/embed/${current.videoId}`,
    `?autoplay=1&mute=1&start=${startSec}`,
    `&controls=0&modestbranding=1&iv_load_policy=3`,
    `&rel=0&disablekb=1&fs=0&playsinline=1`,
  ].join('');

  return (
    <div className={styles.container}>
      <iframe
        key={`${current.videoId}-${startSec}`}
        className={styles.iframe}
        src={src}
        allow="autoplay; encrypted-media"
        allowFullScreen={false}
        title={current.title}
      />
      <div className={styles.gradient} />
      <div className={styles.info}>
        <span className={styles.channel}>GameTrailers</span>
        <span className={styles.title}>{current.title}</span>
      </div>
    </div>
  );
}
