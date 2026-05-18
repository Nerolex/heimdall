import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlexSession } from './plexTypes';

interface UsePlexPlaybackInput {
  session: PlexSession | null;
  history: PlexSession[];
  historyIndex: number;
  setHistoryIndex: (idx: number) => void;
  replaceHistory: (items: PlexSession[], idx: number) => void;
}

export function usePlexPlayback({
  session,
  history,
  historyIndex,
  setHistoryIndex,
  replaceHistory,
}: UsePlexPlaybackInput) {
  const [localPlaying, setLocalPlaying] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);
  const [localDuration, setLocalDuration] = useState(0);
  const [currentTrack, setCurrentTrack] = useState<PlexSession | null>(null);
  const [repeatMode, setRepeatMode] = useState<0 | 1 | 2>(0); // 0=off, 1=all, 2=one
  const [shuffleOn, setShuffleOn] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const displayItem = currentTrack || session || history[historyIndex] || null;

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

  function resetProgress() {
    setLocalProgress(0);
    setLocalDuration(0);
  }

  const playTrackPart = useCallback(async (partKey: string) => {
    if (!audioRef.current) return;
    audioRef.current.src = `/api/plex/stream?path=${encodeURIComponent(partKey)}`;
    await audioRef.current.play();
    setLocalPlaying(true);
  }, []);

  const loadAndPlayTrack = useCallback(async (item: PlexSession) => {
    const res = await fetch(`/api/plex/children?path=${encodeURIComponent(item.key)}`);
    const data = await res.json();
    const track = data?.MediaContainer?.Metadata?.[0];
    const partKey = track?.Media?.[0]?.Part?.[0]?.key || item.Media?.[0]?.Part?.[0]?.key;
    if (partKey) {
      await playTrackPart(partKey);
    }
  }, [playTrackPart]);

  const handleSkip = useCallback((direction: number): void => {
    if (!history.length) return;
    setCurrentTrack(null);
    if (audioRef.current) {
      audioRef.current.pause();
      resetProgress();
    }
    const nextIdx = (() => {
      const next = historyIndex + direction;
      if (next < 0) return history.length - 1;
      return next % history.length;
    })();
    setHistoryIndex(nextIdx);
    const item = history[nextIdx];
    if (item) {
      loadAndPlayTrack(item).catch(() => {});
    }
  }, [history, historyIndex, loadAndPlayTrack, setHistoryIndex]);

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
      resetProgress();
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
  }, [handleSkip]);

  async function handlePlay(): Promise<void> {
    if (!audioRef.current || !displayItem) return;
    if (localPlaying) {
      audioRef.current.pause();
      setLocalPlaying(false);
      return;
    }
    if (audioRef.current.src && audioRef.current.src !== window.location.href) {
      await audioRef.current.play();
      setLocalPlaying(true);
      return;
    }
    await loadAndPlayTrack(displayItem).catch(() => {});
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>): void {
    e.stopPropagation();
    if (!audioRef.current || !localDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = (pct * localDuration) / 1000;
  }

  async function playSelectedTrack(track: PlexSession, allTracks?: PlexSession[]): Promise<void> {
    const partKey = track.Media?.[0]?.Part?.[0]?.key;
    if (!partKey) return;
    const queue = allTracks && allTracks.length > 0 ? allTracks : [track];
    const idx = queue.findIndex((t) => t.ratingKey === track.ratingKey);
    replaceHistory(queue, idx >= 0 ? idx : 0);
    setCurrentTrack(null);
    await playTrackPart(partKey).catch(() => {});
  }

  return {
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
  };
}

export function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}
