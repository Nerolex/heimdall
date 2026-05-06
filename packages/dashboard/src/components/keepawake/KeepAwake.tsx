import React, { useEffect, useRef, useState, useCallback } from 'react';
import styles from './KeepAwake.module.css';
import silenceUrl from './silence.wav';

interface KeepAwakeProps {
  /** "auto" = enabled on Silk browser, true/false = explicit */
  mode?: boolean | 'auto';
}

function isSilkBrowser(): boolean {
  return /\bSilk\b/i.test(navigator.userAgent);
}

/**
 * Invisible component that keeps the Silk browser (Echo Show) awake
 * by playing a silent audio loop. Requires one user tap to activate
 * due to browser autoplay restrictions.
 */
export function KeepAwake({ mode = 'auto' }: KeepAwakeProps): React.ReactElement | null {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [needsTap, setNeedsTap] = useState(false);
  const [active, setActive] = useState(false);

  const enabled = mode === 'auto' ? isSilkBrowser() : mode;

  const activate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().then(() => {
      setNeedsTap(false);
      setActive(true);
    }).catch(() => {
      // Still blocked, keep showing tap overlay
      setNeedsTap(true);
    });
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const audio = new Audio(silenceUrl);
    audio.loop = true;
    audio.volume = 0.01; // Near-silent
    audioRef.current = audio;

    // Try autoplay first
    audio.play().then(() => {
      setActive(true);
    }).catch(() => {
      // Autoplay blocked — need user gesture
      setNeedsTap(true);
    });

    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [enabled]);

  if (!enabled || active) return null;

  if (needsTap) {
    return (
      <div className={styles.tapOverlay} onClick={activate}>
        <div className={styles.tapPrompt}>
          <span className={styles.tapIcon}>👆</span>
          <span>Tap to activate display</span>
        </div>
      </div>
    );
  }

  return null;
}
