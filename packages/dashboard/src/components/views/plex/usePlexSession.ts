import { useEffect, useRef, useState } from 'react';
import type { PlexSession } from './plexTypes';

const POLL_INTERVAL = 3000;

// Shared state so detail view shows same track as slide view
let sharedHistory: PlexSession[] = [];
let sharedHistoryIndex = 0;

/** Fetch active music session for primary account */
export function usePlexSession(isDetail = false) {
  const [session, setSession] = useState<PlexSession | null>(null);
  const [history, setHistory] = useState<PlexSession[]>(sharedHistory);
  const [historyIndex, setHistoryIndexState] = useState(sharedHistoryIndex);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function setHistoryIndex(idx: number) {
    sharedHistoryIndex = idx;
    setHistoryIndexState(idx);
  }

  function replaceHistory(items: PlexSession[], idx: number) {
    sharedHistory = items;
    sharedHistoryIndex = idx;
    setHistory(items);
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
    if (isDetail) {
      setHistory(sharedHistory);
      setHistoryIndexState(sharedHistoryIndex);
      return;
    }
    fetch('/api/plex/history?limit=30')
      .then((r) => r.json())
      .then((data) => {
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

  return { session, history, historyIndex, setHistoryIndex, replaceHistory, loading };
}

export function getDisplayInfo(session: PlexSession | null) {
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
