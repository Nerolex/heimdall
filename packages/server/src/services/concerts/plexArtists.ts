/**
 * Fetch music artists from Plex library
 */

interface PlexConfig {
  url: string;
  token: string;
}

interface PlexArtist {
  title: string;
  guid?: string;
  thumb?: string;
  art?: string;
}

interface PlexMediaContainer {
  MediaContainer: {
    Metadata?: PlexArtist[];
  };
}

/**
 * Extract MusicBrainz ID from Plex GUID
 * Example: "plex://artist/5b11f4ce-a62d-471e-81fc-a69a8278c7da" -> "5b11f4ce-a62d-471e-81fc-a69a8278c7da"
 */
function extractMbid(guid: string | undefined): string | null {
  if (!guid) return null;
  const match = guid.match(/plex:\/\/artist\/([a-f0-9-]{36})/i);
  return match ? match[1] : null;
}

/**
 * Fetch all artists from Plex music library
 */
export async function fetchPlexArtists(
  plexConfig: PlexConfig
): Promise<Array<{ name: string; mbid: string | null; thumb: string | null; art: string | null }>> {
  try {
    const { url, token } = plexConfig;
    const baseUrl = url.replace(/\/$/, '');

    // Get music library section
    const sectionsRes = await fetch(`${baseUrl}/library/sections?X-Plex-Token=${token}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!sectionsRes.ok) {
      console.error('[concerts] Failed to fetch Plex sections');
      return [];
    }

    const sectionsData = await sectionsRes.json();
    const sections = sectionsData?.MediaContainer?.Directory || [];
    const musicSection = sections.find((s: { type: string }) => s.type === 'artist');

    if (!musicSection) {
      console.warn('[concerts] No music library found in Plex');
      return [];
    }

    // Fetch all artists from the music section
    const artistsRes = await fetch(
      `${baseUrl}/library/sections/${musicSection.key}/all?X-Plex-Token=${token}`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!artistsRes.ok) {
      console.error('[concerts] Failed to fetch Plex artists');
      return [];
    }

    const artistsData: PlexMediaContainer = await artistsRes.json();
    const artists = artistsData?.MediaContainer?.Metadata || [];

    return artists.map(artist => ({
      name: artist.title,
      mbid: extractMbid(artist.guid),
      thumb: artist.thumb || null,
      art: artist.art || null,
    }));
  } catch (error) {
    console.error('[concerts] Error fetching Plex artists:', error);
    return [];
  }
}
