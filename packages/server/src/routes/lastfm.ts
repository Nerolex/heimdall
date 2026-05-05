import type { FastifyInstance } from 'fastify';

const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0/';

interface LastFmImage {
  '#text': string;
  size: string;
}

interface LastFmTrack {
  name: string;
  artist: { '#text': string } | string;
  album: { '#text': string } | string;
  image: LastFmImage[];
  '@attr'?: { nowplaying: string };
  date?: { '#text': string; uts: string };
  url: string;
}

export async function lastfmRoute(fastify: FastifyInstance): Promise<void> {
  // Get recent tracks (includes now playing)
  fastify.get<{
    Querystring: { apiKey: string; user: string; limit?: string };
  }>('/api/lastfm/recent', async (request, reply) => {
    const { apiKey, user, limit = '10' } = request.query;
    if (!apiKey || !user) {
      return reply.status(400).send({ error: 'apiKey and user required' });
    }

    const url = `${LASTFM_BASE}?method=user.getrecenttracks&user=${encodeURIComponent(user)}&api_key=${apiKey}&format=json&limit=${limit}`;
    const res = await fetch(url);
    const data = await res.json();

    const tracks: LastFmTrack[] = data?.recenttracks?.track || [];

    const nowPlaying = tracks.find((t) => t['@attr']?.nowplaying === 'true') || null;
    const recent = tracks
      .filter((t) => !t['@attr']?.nowplaying)
      .map((t) => ({
        name: t.name,
        artist: typeof t.artist === 'string' ? t.artist : t.artist['#text'],
        album: typeof t.album === 'string' ? t.album : t.album['#text'],
        image: t.image?.find((i) => i.size === 'extralarge')?.['#text'] || t.image?.at(-1)?.['#text'] || '',
        date: t.date?.['#text'] || '',
        timestamp: t.date?.uts ? Number(t.date.uts) : 0,
        url: t.url,
      }));

    const formatTrack = (t: LastFmTrack) => ({
      name: t.name,
      artist: typeof t.artist === 'string' ? t.artist : t.artist['#text'],
      album: typeof t.album === 'string' ? t.album : t.album['#text'],
      image: t.image?.find((i) => i.size === 'extralarge')?.['#text'] || t.image?.at(-1)?.['#text'] || '',
      url: t.url,
    });

    return {
      nowPlaying: nowPlaying ? formatTrack(nowPlaying) : null,
      recent,
    };
  });
}
