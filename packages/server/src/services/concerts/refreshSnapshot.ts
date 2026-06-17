/**
 * Periodic refresh orchestration for concerts snapshot
 */

import type { ConcertsProviderConfig, ConcertsViewSnapshot, PlexConfig } from '@heimdall/shared';
import { fetchPlexArtists } from './plexArtists.js';
import { fetchConcertsForArtists } from './setlistfm.js';
import { saveSnapshot, getSnapshot } from './snapshotStore.js';

interface ConcertsConfig {
  concerts: ConcertsProviderConfig;
  plex?: PlexConfig;
  events?: { lat?: number; lng?: number };
}

/**
 * Refresh concerts snapshot from Plex artists and Setlist.fm API
 */
export async function refreshConcertsSnapshot(config: ConcertsConfig): Promise<void> {
  const concertsConfig = config.concerts;
  
  if (!concertsConfig.apiKey) {
    console.error('[concerts] No Setlist.fm API key configured');
    return;
  }

  console.log('[concerts] Starting refresh...');

  try {
    // Determine artists to track
    let artistsToTrack: Array<{ name: string; mbid: string | null }> = [];

    if (concertsConfig.artists && concertsConfig.artists.length > 0) {
      // Use manually configured artists
      artistsToTrack = concertsConfig.artists.map((name: string) => ({ name, mbid: null }));
      console.log('[concerts] Using configured artists:', artistsToTrack.length);
    } else if (config.plex) {
      // Fetch from Plex library
      artistsToTrack = await fetchPlexArtists(config.plex);
      console.log('[concerts] Fetched artists from Plex:', artistsToTrack.length);
    } else {
      console.warn('[concerts] No artists configured and no Plex config found');
      return;
    }

    if (artistsToTrack.length === 0) {
      console.warn('[concerts] No artists to track');
      const snapshot: ConcertsViewSnapshot = {
        concerts: [],
        totalFetched: 0,
        refreshedAt: new Date().toISOString(),
        stale: false,
        artistsTracked: [],
      };
      saveSnapshot(snapshot);
      return;
    }

    // Determine location (concerts config > events config fallback)
    const lat = concertsConfig.lat ?? config.events?.lat ?? 51.5136;
    const lng = concertsConfig.lng ?? config.events?.lng ?? 7.4653;
    const radiusKm = concertsConfig.radiusKm ?? 100;

    console.log(`[concerts] Searching within ${radiusKm}km of [${lat}, ${lng}]`);

    // Fetch concerts for all artists
    const concerts = await fetchConcertsForArtists(
      { apiKey: concertsConfig.apiKey, lat, lng, radiusKm },
      artistsToTrack
    );

    // Save snapshot
    const snapshot: ConcertsViewSnapshot = {
      concerts,
      totalFetched: concerts.length,
      refreshedAt: new Date().toISOString(),
      stale: false,
      artistsTracked: artistsToTrack.map(a => a.name),
    };

    saveSnapshot(snapshot);
    console.log('[concerts] Refresh complete:', concerts.length, 'concerts found');
  } catch (error) {
    console.error('[concerts] Refresh failed:', error);
    
    // Mark existing snapshot as stale
    const existing = getSnapshot();
    if (existing) {
      existing.stale = true;
      existing.error = String(error);
      saveSnapshot(existing);
    }
  }
}

/**
 * Start periodic refresh scheduler
 */
export function startConcertsRefreshScheduler(config: ConcertsConfig): void {
  const refreshInterval = (config.concerts.refreshInterval ?? 6) * 60 * 60 * 1000; // hours to ms
  
  // Initial refresh
  refreshConcertsSnapshot(config).catch(console.error);

  // Periodic refresh
  setInterval(() => {
    refreshConcertsSnapshot(config).catch(console.error);
  }, refreshInterval);

  console.log(`[concerts] Refresh scheduler started (every ${config.concerts.refreshInterval ?? 6}h)`);
}
