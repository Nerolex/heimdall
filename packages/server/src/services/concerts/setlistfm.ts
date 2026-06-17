/**
 * Setlist.fm API integration for concert data.
 * Docs: https://api.setlist.fm/docs/1.0/index.html
 */

import type { ConcertRecord } from '@heimdall/shared';

interface SetlistfmConfig {
  apiKey: string;
  lat: number;
  lng: number;
  radiusKm: number;
}

interface SetlistfmVenue {
  name: string;
  city: {
    name: string;
    coords?: {
      lat: number;
      long: number;
    };
    country: {
      name: string;
    };
  };
}

interface SetlistfmEvent {
  id: string;
  eventDate: string;
  artist: {
    name: string;
    mbid: string;
  };
  venue: SetlistfmVenue;
  url?: string;
}

interface SetlistfmResponse {
  setlist: SetlistfmEvent[];
  total: number;
  page: number;
  itemsPerPage: number;
}

/**
 * Calculate distance between two lat/lng points using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format date for display (e.g., "15. Juni 2026")
 */
function formatDateDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const months = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];
  return `${day}. ${months[date.getMonth()]} ${year}`;
}

/**
 * Fetch concerts for a specific artist near the given location
 */
export async function fetchArtistConcerts(
  config: SetlistfmConfig,
  artistName: string,
  artistMbid: string | null
): Promise<ConcertRecord[]> {
  const baseUrl = 'https://api.setlist.fm/rest/1.0';
  
  // Try MBID first (more accurate), fall back to artist name
  const searchParam = artistMbid
    ? `artistMbid=${encodeURIComponent(artistMbid)}`
    : `artistName=${encodeURIComponent(artistName)}`;
  
  const url = `${baseUrl}/search/setlists?${searchParam}&p=1`;

  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'x-api-key': config.apiKey,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn(`[concerts] Setlist.fm API error for ${artistName}: ${res.status}`);
      return [];
    }

    const data: SetlistfmResponse = await res.json();
    const now = new Date();
    const concerts: ConcertRecord[] = [];

    for (const setlist of data.setlist) {
      const eventDate = new Date(setlist.eventDate.split('-').map(Number).join('-'));
      
      // Only include future concerts
      if (eventDate < now) continue;

      const venueCoords = setlist.venue.city.coords;
      let distanceKm: number | null = null;

      // Calculate distance if we have venue coordinates
      if (venueCoords) {
        distanceKm = calculateDistance(
          config.lat,
          config.lng,
          venueCoords.lat,
          venueCoords.long
        );

        // Filter by radius
        if (distanceKm > config.radiusKm) continue;
      }

      concerts.push({
        id: setlist.id,
        artistName: setlist.artist.name,
        artistMbid: setlist.artist.mbid || null,
        date: setlist.eventDate,
        dateDisplay: formatDateDisplay(setlist.eventDate),
        venue: setlist.venue.name,
        city: setlist.venue.city.name,
        country: setlist.venue.city.country.name,
        coordinates: venueCoords
          ? { lat: venueCoords.lat, lng: venueCoords.long }
          : null,
        distanceKm,
        eventUrl: setlist.url || null,
        lastFmUrl: `https://www.last.fm/music/${encodeURIComponent(setlist.artist.name)}/+events`,
      });
    }

    return concerts;
  } catch (error) {
    console.error(`[concerts] Error fetching concerts for ${artistName}:`, error);
    return [];
  }
}

/**
 * Fetch concerts for multiple artists in parallel
 */
export async function fetchConcertsForArtists(
  config: SetlistfmConfig,
  artists: Array<{ name: string; mbid: string | null }>
): Promise<ConcertRecord[]> {
  const allConcerts = await Promise.all(
    artists.map(artist => fetchArtistConcerts(config, artist.name, artist.mbid))
  );

  // Flatten and sort by date
  const concerts = allConcerts.flat();
  concerts.sort((a, b) => a.date.localeCompare(b.date));

  return concerts;
}
