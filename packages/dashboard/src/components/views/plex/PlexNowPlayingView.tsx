import React, { useEffect, useState, useRef } from 'react';
import styles from './Plex.module.css';
import detailStyles from '../../detail/Detail.module.css';

interface PlexPart {
  key: string;
  container: string;
  duration: number;
}

interface PlexMedia {
  Part: PlexPart[];
  container: string;
  audioCodec?: string;
}

export interface PlexSession {
  title: string;
  grandparentTitle?: string;
  parentTitle?: string;
  type: string;
  thumb?: string;
  art?: string;
  grandparentArt?: string;
  grandparentThumb?: string;
  parentThumb?: string;
  parentRatingKey?: string;
  parentKey?: string;
  grandparentKey?: string;
  duration?: number;
  viewOffset?: number;
  ratingKey: string;
  index?: number;
  key: string;
  Media?: PlexMedia[];
  Player?: {
    machineIdentifier: string;
    state: string;
    title: string;
    address?: string;
    port?: number;
    local?: boolean;
  };
  Session?: {
    id: string;
  };
}

interface Props {
  settings: Record<string, unknown>;
}

const POLL_INTERVAL = 3000;

// Shared state so detail view shows same track as slide view
let sharedHistory: PlexSession[] = [];
let sharedHistoryIndex = 0;

/** Fetch active music session for primary account */
function usePlexSession(isDetail = false) {
  const [session, setSession] = useState<PlexSession | null>(null);
  const [history, setHistory] = useState<PlexSession[]>(sharedHistory);
  const [historyIndex, setHistoryIndexState] = useState(sharedHistoryIndex);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function setHistoryIndex(idx: number) {
    sharedHistoryIndex = idx;
    setHistoryIndexState(idx);
  }

  useEffect(() => {
    async function fetchSessions(): Promise<void> {
      try {
        const res = await fetch('/api/plex/sessions');
        if (!res.ok) throw new Error();
        const data = await res.json();
        const sessions = data?.MediaContainer?.Metadata;
        const musicSession = sessions?.find(
          (s: PlexSession & { User?: { id: string } }) =>
            s.type === 'track' && s.User?.id === '1'
        );
        setSession(musicSession || null);
      } catch {
        setSession(null);
      }
      setLoading(false);
    }
    fetchSessions();
    pollRef.current = setInterval(fetchSessions, POLL_INTERVAL);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    // Detail view just syncs from shared state, doesn't re-fetch
    if (isDetail) {
      setHistory(sharedHistory);
      setHistoryIndexState(sharedHistoryIndex);
      return;
    }
    fetch('/api/plex/history?limit=30')
      .then(r => r.json())
      .then(data => {
        const items = data?.MediaContainer?.Metadata || [];
        const seen = new Set<string>();
        const unique = items.filter((item: PlexSession) => {
          if (item.type !== 'track') return false;
          if (seen.has(item.ratingKey)) return false;
          seen.add(item.ratingKey);
          return true;
        });
        sharedHistory = unique;
        setHistory(unique);
        if (unique.length > 0 && sharedHistoryIndex === 0) {
          const idx = Math.floor(Math.random() * unique.length);
          sharedHistoryIndex = idx;
          setHistoryIndexState(idx);
        }
      })
      .catch(() => {});
  }, [isDetail]);

  return { session, history, historyIndex, setHistoryIndex, loading };
}

function getDisplayInfo(session: PlexSession | null) {
  if (!session) return { title: '', subtitle: '', thumb: '', art: '' };
  const thumb = session.grandparentThumb || session.parentThumb || session.thumb || '';
  const art = session.art || session.grandparentArt || '';
  let title = session.title;
  let subtitle = '';
  if (session.type === 'track') {
    subtitle = session.grandparentTitle || '';
  } else if (session.type === 'episode') {
    title = session.grandparentTitle || session.title;
    subtitle = session.parentTitle ? `${session.parentTitle} — ${session.title}` : session.title;
  }
  return { title, subtitle, thumb, art };
}

/** Slide view — just shows what's playing/recently played, no controls */
export function PlexNowPlayingView({ settings }: Props): React.ReactElement {
  const { session, history, historyIndex, loading } = usePlexSession();

  if (loading) return <div className={styles.container} />;

  const displayItem = session || history[historyIndex] || null;
  if (!displayItem) {
    return (
      <div className={styles.container}>
        <div className={styles.idle}>
          <div className={styles.idleIcon}>♪</div>
          <div className={styles.idleText}>No music</div>
        </div>
      </div>
    );
  }

  const { title, subtitle, thumb, art } = getDisplayInfo(displayItem);
  const playerName = session?.Player?.title || '';

  return (
    <div className={styles.container}>
      {art && <img src={`/api/plex/thumb?path=${encodeURIComponent(art)}`} alt="" className={styles.bgArt} />}
      <div className={styles.content}>
        {thumb && (
          <img
            src={`/api/plex/thumb?path=${encodeURIComponent(thumb)}`}
            alt=""
            className={styles.poster}
          />
        )}
        <div className={styles.info}>
          <div className={styles.title}>{title}</div>
          {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
          {playerName && <div className={styles.playerName}>{playerName}</div>}
        </div>
      </div>
    </div>
  );
}

/** Detail view — full media player with controls */
export function PlexDetailView({ settings, onClose }: { settings: Record<string, unknown>; onClose: () => void }): React.ReactElement {
  const { session, history, historyIndex, setHistoryIndex, loading } = usePlexSession(true);
  const [localPlaying, setLocalPlaying] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const [localDuration, setLocalDuration] = useState(0);
  const [showTracklist, setShowTracklist] = useState(false);
  const [albumTracks, setAlbumTracks] = useState<PlexSession[]>([]);
  const [showAlbumList, setShowAlbumList] = useState(false);
  const [artistAlbums, setArtistAlbums] = useState<PlexSession[]>([]);
  const [currentTrack, setCurrentTrack] = useState<PlexSession | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Track local audio progress
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      setLocalProgress(audio.currentTime * 1000);
    };
    const onDuration = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setLocalDuration(audio.duration * 1000);
      }
    };
    const onLoadStart = () => {
      setLocalProgress(0);
      setLocalDuration(0);
    };
    const onEnded = () => {
      handleSkip(1);
    };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('durationchange', onDuration);
    audio.addEventListener('loadstart', onLoadStart);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('durationchange', onDuration);
      audio.removeEventListener('loadstart', onLoadStart);
      audio.removeEventListener('ended', onEnded);
    };
  }, [history, historyIndex]);

  const displayItem = currentTrack || session || history[historyIndex] || null;

  async function handlePlay(): Promise<void> {
    if (!audioRef.current || !displayItem) return;
    if (localPlaying) {
      audioRef.current.pause();
      setLocalPlaying(false);
      return;
    }
    // If already loaded, just resume
    if (audioRef.current.src && audioRef.current.src !== window.location.href) {
      audioRef.current.play();
      setLocalPlaying(true);
      return;
    }
    // Fetch stream key from metadata
    try {
      const res = await fetch(`/api/plex/children?path=${encodeURIComponent(displayItem.key)}`);
      const data = await res.json();
      const track = data?.MediaContainer?.Metadata?.[0];
      const partKey = track?.Media?.[0]?.Part?.[0]?.key || displayItem.Media?.[0]?.Part?.[0]?.key;
      if (partKey) {
        audioRef.current.src = `/api/plex/stream?path=${encodeURIComponent(partKey)}`;
        audioRef.current.play();
        setLocalPlaying(true);
      }
    } catch {}
  }

  function handleSkip(direction: number): void {
    if (!history.length) return;
    if (audioRef.current) {
      audioRef.current.pause();
      setLocalProgress(0);
      setLocalDuration(0);
    }
    const nextIdx = (() => {
      const next = historyIndex + direction;
      if (next < 0) return history.length - 1;
      return next % history.length;
    })();
    setHistoryIndex(nextIdx);
    // Always play on skip
    const item = history[nextIdx];
    if (item && audioRef.current) {
      fetch(`/api/plex/children?path=${encodeURIComponent(item.key)}`)
        .then(r => r.json())
        .then(data => {
          const track = data?.MediaContainer?.Metadata?.[0];
          const partKey = track?.Media?.[0]?.Part?.[0]?.key;
          if (partKey && audioRef.current) {
            audioRef.current.src = `/api/plex/stream?path=${encodeURIComponent(partKey)}`;
            audioRef.current.play();
            setLocalPlaying(true);
          }
        })
        .catch(() => {});
    }
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>): void {
    e.stopPropagation();
    if (!audioRef.current || !localDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = (pct * localDuration) / 1000;
  }

  async function handleAlbumClick(): Promise<void> {
    if (showTracklist) {
      setShowTracklist(false);
      return;
    }
    if (!displayItem) return;
    // History items use parentKey, sessions use parentRatingKey
    let albumPath: string | null = null;
    if (displayItem.parentRatingKey) {
      albumPath = `/library/metadata/${displayItem.parentRatingKey}/children`;
    } else if (displayItem.parentKey) {
      albumPath = `${displayItem.parentKey}/children`;
    }
    if (!albumPath) return;
    try {
      const res = await fetch(`/api/plex/children?path=${encodeURIComponent(albumPath)}`);
      const data = await res.json();
      const tracks = data?.MediaContainer?.Metadata || [];
      setAlbumTracks(tracks);
      setShowTracklist(true);
    } catch {}
  }

  async function handleTrackSelect(track: PlexSession): Promise<void> {
    if (!audioRef.current) return;
    const partKey = track.Media?.[0]?.Part?.[0]?.key;
    if (partKey) {
      setCurrentTrack(track);
      audioRef.current.src = `/api/plex/stream?path=${encodeURIComponent(partKey)}`;
      audioRef.current.play();
      setLocalPlaying(true);
      setShowTracklist(false);
    }
  }

  async function handleArtistClick(): Promise<void> {
    if (showAlbumList) {
      setShowAlbumList(false);
      return;
    }
    if (!displayItem) return;
    const artistKey = displayItem.grandparentKey
      ? `${displayItem.grandparentKey}/children`
      : null;
    if (!artistKey) return;
    try {
      const res = await fetch(`/api/plex/children?path=${encodeURIComponent(artistKey)}`);
      const data = await res.json();
      const albums = (data?.MediaContainer?.Metadata || []).filter(
        (a: PlexSession) => a.type === 'album'
      );
      setArtistAlbums(albums);
      setShowAlbumList(true);
    } catch {}
  }

  async function handleAlbumSelect(album: PlexSession): Promise<void> {
    if (!audioRef.current) return;
    try {
      const res = await fetch(`/api/plex/children?path=${encodeURIComponent(`/library/metadata/${album.ratingKey}/children`)}`);
      const data = await res.json();
      const tracks = data?.MediaContainer?.Metadata || [];
      setAlbumTracks(tracks);
      setShowAlbumList(false);
      setShowTracklist(true);
      if (tracks.length > 0) {
        const firstTrack = tracks[0];
        const partKey = firstTrack.Media?.[0]?.Part?.[0]?.key;
        if (partKey) {
          setCurrentTrack(firstTrack);
          audioRef.current.src = `/api/plex/stream?path=${encodeURIComponent(partKey)}`;
          audioRef.current.play();
          setLocalPlaying(true);
        }
      }
    } catch {}
  }

  function formatTime(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  if (!displayItem) {
    return (
      <div className={styles.container}>
        <div className={styles.idle}>
          <div className={styles.idleIcon}>♪</div>
          <div className={styles.idleText}>No music</div>
        </div>
      </div>
    );
  }

  const { title, subtitle, thumb, art } = getDisplayInfo(displayItem);
  const progressMs = localProgress;
  const durationMs = localDuration;
  const progress = durationMs > 0 ? (progressMs / durationMs) * 100 : 0;

  return (
    <div className={detailStyles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { setShowTracklist(false); setShowAlbumList(false); }}>
      <audio ref={audioRef} preload="none" />
      {art && <img src={`/api/plex/thumb?path=${encodeURIComponent(art)}`} alt="" className={styles.bgArt} />}
      <div className={styles.content}>
        {showAlbumList ? (
          <div className={styles.tracklist}>
            {artistAlbums.map((album) => (
              <div
                key={album.ratingKey}
                className={styles.trackItem}
                onClick={(e) => { e.stopPropagation(); handleAlbumSelect(album); }}
              >
                {album.thumb && (
                  <img
                    src={`/api/plex/thumb?path=${encodeURIComponent(album.thumb)}`}
                    alt=""
                    className={styles.albumThumb}
                  />
                )}
                <span className={styles.trackTitle}>{album.title}</span>
              </div>
            ))}
          </div>
        ) : showTracklist ? (
          <div className={styles.tracklist}>
            {albumTracks.map((track) => (
              <div
                key={track.ratingKey}
                className={`${styles.trackItem} ${track.ratingKey === displayItem.ratingKey ? styles.trackItemActive : ''}`}
                onClick={(e) => { e.stopPropagation(); handleTrackSelect(track); }}
              >
                <span className={styles.trackIndex}>{track.index || '·'}</span>
                <span className={styles.trackTitle}>{track.title}</span>
              </div>
            ))}
          </div>
        ) : (
          thumb && (
            <img
              src={`/api/plex/thumb?path=${encodeURIComponent(thumb)}`}
              alt=""
              className={styles.poster}
              onClick={(e) => { e.stopPropagation(); handleAlbumClick(); }}
              style={{ cursor: 'pointer' }}
            />
          )
        )}
        <div className={styles.info} onClick={(e) => e.stopPropagation()}>
          <div className={styles.title}>{title}</div>
          {subtitle && (
            <div className={styles.subtitle} onClick={handleArtistClick} style={{ cursor: 'pointer' }}>
              {subtitle}
            </div>
          )}
          {/* audio indicator handled by controls */}

          <div className={styles.progressContainer}>
            <span className={styles.time}>{formatTime(progressMs)}</span>
            <div className={styles.progressBar} onClick={handleSeek} style={{ cursor: 'pointer' }}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
            <span className={styles.time}>{formatTime(durationMs)}</span>
          </div>

          <div className={styles.controls}>
            <button className={styles.controlBtn} onClick={() => handleSkip(-1)}>⏮</button>
            <button className={styles.controlBtnLarge} onClick={handlePlay}>
              {localPlaying ? '⏸' : '▶'}
            </button>
            <button className={styles.controlBtn} onClick={() => handleSkip(1)}>⏭</button>
          </div>
        </div>
      </div>
      <button className={detailStyles.closeButton} onClick={(e) => { e.stopPropagation(); onClose(); }}>✕</button>
    </div>
  );
}
