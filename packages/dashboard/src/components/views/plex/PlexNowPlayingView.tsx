import React, { useEffect, useRef, useState } from 'react';
import { Heart, Repeat, Repeat1, Shuffle } from 'lucide-react';
import styles from './Plex.module.css';
import detailStyles from '../../detail/Detail.module.css';
import type { NavEntry, PlexSession } from './plexTypes';
import { getDisplayInfo, usePlexSession } from './usePlexSession';
import { formatTime, usePlexPlayback } from './usePlexPlayback';
import { PlexNavOverlay } from './PlexNavOverlay';

interface Props {
  settings: Record<string, unknown>;
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
      const album = h.parentRatingKey || h.parentKey || '';
      return arr.findIndex((x) => (x.parentRatingKey || x.parentKey) === album) === i;
    })
    .slice(0, 2)
    .map((h) => getDisplayInfo(h).thumb)
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

/** Detail view — full media player with controls */
export function PlexDetailView({ settings, onClose }: { settings: Record<string, unknown>; onClose: () => void }): React.ReactElement {
  const { session, history, historyIndex, setHistoryIndex, replaceHistory } = usePlexSession(true);
  const [navStack, setNavStack] = useState<NavEntry[]>([]);
  const [navLoading, setNavLoading] = useState(false);
  const [navClosing, setNavClosing] = useState(false);
  const navCloseTimer = useRef<ReturnType<typeof setTimeout>>();
  const {
    audioRef,
    displayItem,
    localPlaying,
    localProgress,
    localDuration,
    repeatMode,
    shuffleOn,
    isFavorited,
    handlePlay,
    handleSkip,
    handleSeek,
    handleRepeat,
    handleShuffle,
    handleFavorite,
    playSelectedTrack,
  } = usePlexPlayback({ session, history, historyIndex, setHistoryIndex, replaceHistory });

  function closeNav() {
    setNavClosing(true);
    navCloseTimer.current = setTimeout(() => {
      setNavStack([]);
      setNavClosing(false);
    }, 210);
  }

  useEffect(() => () => {
    if (navCloseTimer.current) clearTimeout(navCloseTimer.current);
  }, []);

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

      const stack: NavEntry[] = [{ kind: 'artists', items: artists, label: 'Artists' }];
      if (albums.length) stack.push({ kind: 'albums', items: albums, label: displayItem.grandparentTitle || 'Albums' });
      if (tracks.length) stack.push({ kind: 'tracks', items: tracks, label: displayItem.parentTitle || 'Tracks' });
      setNavStack(stack);
    } catch {
      // intentionally ignore transient network errors in picker overlay
    } finally {
      setNavLoading(false);
    }
  }

  async function handleArtistSelect(artist: PlexSession): Promise<void> {
    setNavLoading(true);
    try {
      const res = await fetch(`/api/plex/children?path=${encodeURIComponent(artist.key)}`);
      const data = await res.json();
      const albums = (data?.MediaContainer?.Metadata || []).filter((a: PlexSession) => a.type === 'album');
      setNavStack((s) => [...s, { kind: 'albums', items: albums, label: artist.title }]);
    } catch {
      // intentionally ignore transient network errors in picker overlay
    } finally {
      setNavLoading(false);
    }
  }

  async function handleAlbumSelect(album: PlexSession): Promise<void> {
    setNavLoading(true);
    try {
      const res = await fetch(`/api/plex/children?path=${encodeURIComponent(`/library/metadata/${album.ratingKey}/children`)}`);
      const data = await res.json();
      setNavStack((s) => [...s, { kind: 'tracks', items: data?.MediaContainer?.Metadata || [], label: album.title }]);
    } catch {
      // intentionally ignore transient network errors in picker overlay
    } finally {
      setNavLoading(false);
    }
  }

  async function handleTrackSelect(track: PlexSession, allTracks: PlexSession[]): Promise<void> {
    await playSelectedTrack(track, allTracks);
    closeNav();
  }

  function handleNavBack(): void {
    setNavStack((s) => s.slice(0, -1));
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
  const progress = localDuration > 0 ? (localProgress / localDuration) * 100 : 0;

  return (
    <div className={detailStyles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={closeNav}>
      <audio ref={audioRef} preload="none" />
      {art && <img src={`/api/plex/thumb?path=${encodeURIComponent(art)}`} alt="" className={styles.bgArt} />}

      <PlexNavOverlay
        navStack={navStack}
        navClosing={navClosing}
        navLoading={navLoading}
        activeTrackRatingKey={displayItem.ratingKey}
        onBack={handleNavBack}
        onArtistSelect={handleArtistSelect}
        onAlbumSelect={handleAlbumSelect}
        onTrackSelect={handleTrackSelect}
      />

      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
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

          <div className={styles.progressContainer}>
            <span className={styles.time}>{formatTime(localProgress)}</span>
            <div className={styles.progressBar} onClick={handleSeek} style={{ cursor: 'pointer' }}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
            <span className={styles.time}>{formatTime(localDuration)}</span>
          </div>

          <div className={styles.glyphRow}>
            <button
              className={`${styles.glyphBtn} ${isFavorited ? styles.glyphBtnActive : ''}`}
              onClick={handleFavorite}
            ><Heart size="1em" fill={isFavorited ? 'currentColor' : 'none'} strokeWidth={1.5} /></button>
            <span className={styles.glyphRight}>
              <button
                className={`${styles.glyphBtn} ${shuffleOn ? styles.glyphBtnActive : styles.glyphBtnDim}`}
                onClick={handleShuffle}
              ><Shuffle size="1em" strokeWidth={1.5} /></button>
              <button
                className={`${styles.glyphBtn} ${repeatMode > 0 ? styles.glyphBtnActive : styles.glyphBtnDim}`}
                onClick={handleRepeat}
              >{repeatMode === 2
                ? <Repeat1 size="1em" strokeWidth={1.5} />
                : <Repeat size="1em" strokeWidth={1.5} />
              }</button>
            </span>
          </div>

          <div className={styles.controls}>
            <button className={styles.controlBtn} onClick={() => handleSkip(-1)}>⏮</button>
            <button className={`${styles.controlBtnLarge} ${localPlaying ? styles.controlBtnPause : styles.controlBtnPlay}`} onClick={handlePlay}>
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
