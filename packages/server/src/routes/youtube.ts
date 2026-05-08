import type { FastifyInstance } from 'fastify';

const GAMETRAILERS_CHANNEL_ID = 'UCJx5KP-pCUmL9eZUv-mIcNw';
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${GAMETRAILERS_CHANNEL_ID}`;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

interface VideoEntry {
  videoId: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
}

let cache: { data: VideoEntry[]; ts: number } | null = null;

function parseRssFeed(xml: string): VideoEntry[] {
  const entries: VideoEntry[] = [];
  for (const match of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const entry = match[1];
    const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1] ?? '';
    const rawTitle = entry.match(/<title>([^<]+)<\/title>/)?.[1] ?? '';
    const title = rawTitle
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    const thumbnail = entry.match(/media:thumbnail url="([^"]+)"/)?.[1] ?? '';
    const publishedAt = entry.match(/<published>([^<]+)<\/published>/)?.[1] ?? '';
    if (videoId) entries.push({ videoId, title, thumbnail, publishedAt });
  }
  return entries;
}

export async function youtubeRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/youtube/gametrailers', async (_req, reply) => {
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      return reply.send({ videos: cache.data });
    }

    const res = await fetch(RSS_URL);
    if (!res.ok) {
      return reply.status(502).send({ error: 'Failed to fetch RSS feed' });
    }

    const xml = await res.text();
    const all = parseRssFeed(xml);

    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = all.filter(v => new Date(v.publishedAt).getTime() >= cutoff);
    const videos = recent.length > 0 ? recent : all.slice(0, 15);

    cache = { data: videos, ts: Date.now() };
    return reply.send({ videos });
  });
}
