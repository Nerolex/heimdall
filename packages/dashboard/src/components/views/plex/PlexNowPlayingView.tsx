import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
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

  // Up to 2 *different album* covers from history, behind the current one
  const currentAlbum = displayItem.parentRatingKey || displayItem.parentKey || '';
  const recentThumbs = history
    .filter((h, i) => {
      if (i === historyIndex) return false;
      const album = h.parentRatingKey || h.parentKey || '';
      return album !== currentAlbum && album !== '';
    })
    .filter((h, i, arr) => {
      // dedupe by album
      const album = h.parentRatingKey || h.parentKey || '';
      return arr.findIndex(x => (x.parentRatingKey || x.parentKey) === album) === i;
    })
    .slice(0, 2)
    .map(h => getDisplayInfo(h).thumb)
    .filter(Boolean);

  return (
    <div className={styles.container}>
      {art && <img src={`/api/plex/thumb?path=${encodeURIComponent(art)}`} alt="" className={styles.bgArt} />}
      <div className={styles.content}>
        <div className={styles.coverStack}>
          {recentThumbs[1] && (
            <img src={`/api/plex/thumb?path=${encodeURIComponent(recentThumbs[1])}`} alt="" className={styles.coverBack2} />
          )}
          {recentThumbs[0] && (
            <img src={`/api/plex/thumb?path=${encodeURIComponent(recentThumbs[0])}`} alt="" className={styles.coverBack1} />
          )}
          {thumb && (
            <img src={`/api/plex/thumb?path=${encodeURIComponent(thumb)}`} alt="" className={styles.coverFront} />
          )}
        </div>
        <div className={styles.info}>
          <div className={styles.title}>{title}</div>
          {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
          {playerName && <div className={styles.playerName}>{playerName}</div>}
        </div>
      </div>
    </div>
  );
}

type NavKind = 'artists' | 'albums' | 'tracks';
interface NavEntry { kind: NavKind; items: PlexSession[]; label: string; }

/** Detail view — full media player with controls */
export function PlexDetailView({ settings, onClose }: { settings: Record<string, unknown>; onClose: () => void }): React.ReactElement {
  const { session, history, historyIndex, setHistoryIndex, loading } = usePlexSession(true);
  const [localPlaying, setLocalPlaying] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const [localDuration, setLocalDuration] = useState(0);
  const [navStack, setNavStack] = useState<NavEntry[]>([]);
  const [navLoading, setNavLoading] = useState(false);
  const [navClosing, setNavClosing] = useState(false);
  const navCloseTimer = useRef<ReturnType<typeof setTimeout>>();

  function closeNav() {
    setNavClosing(true);
    navCloseTimer.current = setTimeout(() => {
      setNavStack([]);
      setNavClosing(false);
    }, 210);
  }
  const [currentTrack, setCurrentTrack] = useState<PlexSession | null>(null);
  const [repeatMode, setRepeatMode] = useState<0 | 1 | 2>(0); // 0=off, 1=all, 2=one
  const [shuffleOn, setShuffleOn] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync favorite state from current track
  useEffect(() => {
    const item = currentTrack || session || history[historyIndex] || null;
    setIsFavorited((item as PlexSession & { userRating?: number } | null)?.userRating === 10);
  }, [currentTrack, session, historyIndex, history]);

  function playerBody(extra?: Record<string, unknown>) {
    const player = session?.Player;
    return {
      machineIdentifier: player?.machineIdentifier,
      playerAddress: player?.address,
      playerPort: player?.port,
      playerLocal: player?.local,
      ...extra,
    };
  }

  async function handleRepeat(): Promise<void> {
    const next = ((repeatMode + 1) % 3) as 0 | 1 | 2;
    setRepeatMode(next);
    await fetch('/api/plex/playback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(playerBody({ command: 'setRepeat', repeat: next })),
    }).catch(() => {});
  }

  async function handleShuffle(): Promise<void> {
    const next = !shuffleOn;
    setShuffleOn(next);
    await fetch('/api/plex/playback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(playerBody({ command: 'setShuffle', shuffle: next ? 1 : 0 })),
    }).catch(() => {});
  }

  async function handleFavorite(): Promise<void> {
    const item = currentTrack || session || history[historyIndex] || null;
    if (!item) return;
    const next = !isFavorited;
    setIsFavorited(next);
    await fetch('/api/plex/rate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ratingKey: item.ratingKey, rating: next ? 10 : 0 }),
    }).catch(() => {});
  }

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

  async function handlePosterClick(e: React.MouseEvent): Promise<void> {
    e.stopPropagation();
    if (!displayItem) return;
    setNavLoading(true);
    try {
      const albumPath = displayItem.parentRatingKey
        ? `/library/metadata/${displayItem.parentRatingKey}/children`
        : displayItem.parentKey ? `${displayItem.parentKey}/children` : null;
      const artistKey = displayItem.grandparentKey;

      const [artistsRes, albumsRes, tracksRes] = await Promise.all([
        fetch('/api/plex/artists'),
        artistKey ? fetch(`/api/plex/children?path=${encodeURIComponent(artistKey + '/children')}`) : Promise.resolve(null),
        albumPath ? fetch(`/api/plex/children?path=${encodeURIComponent(albumPath)}`) : Promise.resolve(null),
      ]);

      const artists = (await artistsRes.json())?.MediaContainer?.Metadata || [];
      const albums = albumsRes ? ((await albumsRes.json())?.MediaContainer?.Metadata || []).filter((a: PlexSession) => a.type === 'album') : [];
      const tracks = tracksRes ? (await tracksRes.json())?.MediaContainer?.Metadata || [] : [];

      // Build full stack: artists → artist's albums → current album's tracks
      const stack: NavEntry[] = [
        { kind: 'artists', items: artists, label: 'Artists' },
      ];
      if (albums.length) stack.push({ kind: 'albums', items: albums, label: displayItem.grandparentTitle || 'Albums' });
      if (tracks.length) stack.push({ kind: 'tracks', items: tracks, label: displayItem.parentTitle || 'Tracks' });

      setNavStack(stack);
    } catch {}
    setNavLoading(false);
  }

  async function handleArtistSelect(artist: PlexSession): Promise<void> {
    setNavLoading(true);
    try {
      // artist.key is already "/library/metadata/{id}/children"
      const res = await fetch(`/api/plex/children?path=${encodeURIComponent(artist.key)}`);
      const data = await res.json();
      const albums = (data?.MediaContainer?.Metadata || []).filter((a: PlexSession) => a.type === 'album');
      setNavStack(s => [...s, { kind: 'albums', items: albums, label: artist.title }]);
    } catch {}
    setNavLoading(false);
  }

  async function handleAlbumSelect(album: PlexSession): Promise<void> {
    setNavLoading(true);
    try {
      const res = await fetch(`/api/plex/children?path=${encodeURIComponent(`/library/metadata/${album.ratingKey}/children`)}`);
      const data = await res.json();
      setNavStack(s => [...s, { kind: 'tracks', items: data?.MediaContainer?.Metadata || [], label: album.title }]);
    } catch {}
    setNavLoading(false);
  }

  async function handleTrackSelect(track: PlexSession): Promise<void> {
    if (!audioRef.current) return;
    const partKey = track.Media?.[0]?.Part?.[0]?.key;
    if (partKey) {
      setCurrentTrack(track);
      audioRef.current.src = `/api/plex/stream?path=${encodeURIComponent(partKey)}`;
      audioRef.current.play();
      setLocalPlaying(true);
      closeNav();
    }
  }

  function handleNavBack(): void {
    setNavStack(s => s.slice(0, -1));
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
    <div className={detailStyles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={closeNav}>
      <audio ref={audioRef} preload="none" />
      {art && <img src={`/api/plex/thumb?path=${encodeURIComponent(art)}`} alt="" className={styles.bgArt} />}

      {/* Nav overlay — portalled to body to escape detail stacking context */}
      {(navStack.length > 0 || navClosing) && createPortal(
        <div className={`${styles.navOverlay} ${navClosing ? styles.navOverlayClosing : ''}`} onClick={e => e.stopPropagation()}>
          <div className={styles.navHeader} onClick={handleNavBack}>
            <button className={styles.backBtn}>←</button>
            <span className={styles.navLabel}>{navStack[navStack.length - 1]?.label}</span>
          </div>
          <div className={styles.navList}>
            {navLoading ? (
              <div className={styles.trackItem} style={{ opacity: 0.5 }}>Loading…</div>
            ) : navStack[navStack.length - 1]?.items.map(item => (
              <div
                key={item.ratingKey}
                className={`${styles.trackItem} ${item.ratingKey === displayItem?.ratingKey ? styles.trackItemActive : ''}`}
                onClick={() => {
                  const kind = navStack[navStack.length - 1].kind;
                  if (kind === 'artists') handleArtistSelect(item);
                  else if (kind === 'albums') handleAlbumSelect(item);
                  else handleTrackSelect(item);
                }}
              >
                {(navStack[navStack.length - 1].kind !== 'tracks') && item.thumb && (
                  <img src={`/api/plex/thumb?path=${encodeURIComponent(item.thumb)}`} alt="" className={styles.albumThumb} />
                )}
                {navStack[navStack.length - 1].kind === 'tracks' && (
                  <span className={styles.trackIndex}>{item.index ?? '·'}</span>
                )}
                <span className={styles.trackTitle}>{item.title}</span>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}

      <div className={styles.content} onClick={e => e.stopPropagation()}>
        {thumb && (
          <img
            src={`/api/plex/thumb?path=${encodeURIComponent(thumb)}`}
            alt=""
            className={styles.poster}
            onClick={handlePosterClick}
            style={{ cursor: 'pointer' }}
          />
        )}
        <div className={styles.info} onClick={(e) => e.stopPropagation()}>
          <div className={styles.title}>{title}</div>
          {subtitle && (
            <div className={styles.subtitle}>
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
            <button className={`${styles.controlBtnLarge} ${localPlaying ? styles.controlBtnPause : styles.controlBtnPlay}`} onClick={handlePlay}>
              {localPlaying ? '⏸' : '▶'}
            </button>
            <button className={styles.controlBtn} onClick={() => handleSkip(1)}>⏭</button>
          </div>

          <div className={styles.secondaryControls}>
            <button
              className={`${styles.controlBtn} ${isFavorited ? styles.controlBtnActive : ''}`}
              onClick={handleFavorite}
              title="Favorite"
            >♥</button>
            <button
              className={`${styles.controlBtn} ${shuffleOn ? styles.controlBtnActive : styles.controlBtnDim}`}
              onClick={handleShuffle}
              title="Shuffle"
            >⇄</button>
            <button
              className={`${styles.controlBtn} ${repeatMode > 0 ? styles.controlBtnActive : styles.controlBtnDim}`}
              onClick={handleRepeat}
              title="Repeat"
            >
              {repeatMode === 2 ? '🔂' : '🔁'}
            </button>
          </div>
        </div>
      </div>
      <button className={detailStyles.closeButton} onClick={(e) => { e.stopPropagation(); onClose(); }}>✕</button>
    </div>
  );
}
