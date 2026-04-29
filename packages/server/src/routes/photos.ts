import { type FastifyInstance } from 'fastify';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import sharp from 'sharp';
import type { PhotoEntry } from '@heimdall/shared';

const SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.tiff', '.tif']);

interface PhotoIndex {
  photos: PhotoEntry[];
  byMonthDay: Map<string, PhotoEntry[]>; // "MM-DD" → photos
  lastScanned: number;
}

const photoIndexCache = new Map<string, PhotoIndex>();
const SCAN_INTERVAL = 10 * 60 * 1000; // Re-scan every 10 minutes

/** Recursively find all image files in a directory */
function findImages(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findImages(fullPath));
    } else if (SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      results.push(fullPath);
    }
  }
  return results;
}

/** Extract date taken from EXIF or fall back to file mtime */
async function getDateTaken(filePath: string): Promise<Date> {
  try {
    const metadata = await sharp(filePath).metadata();
    if (metadata.exif) {
      const exifReader = await import('exif-reader');
      const exifData = exifReader.default(metadata.exif);
      if (exifData?.Photo?.DateTimeOriginal) {
        return new Date(exifData.Photo.DateTimeOriginal);
      }
      if (exifData?.Image?.DateTime) {
        return new Date(exifData.Image.DateTime);
      }
    }
  } catch {
    // Fall through to mtime
  }
  const stat = fs.statSync(filePath);
  return stat.mtime;
}

/** Build or retrieve cached photo index for a directory */
async function getPhotoIndex(photosDir: string): Promise<PhotoIndex> {
  const cached = photoIndexCache.get(photosDir);
  if (cached && Date.now() - cached.lastScanned < SCAN_INTERVAL) {
    return cached;
  }

  const imagePaths = findImages(photosDir);
  const photos: PhotoEntry[] = [];

  for (const filePath of imagePaths) {
    const id = crypto.createHash('md5').update(filePath).digest('hex').slice(0, 12);
    const dateTaken = await getDateTaken(filePath);
    let width: number | undefined;
    let height: number | undefined;
    try {
      const meta = await sharp(filePath).metadata();
      width = meta.width;
      height = meta.height;
    } catch {
      // skip dimensions
    }

    photos.push({
      id,
      url: `/api/photos/file/${id}`,
      filename: path.basename(filePath),
      dateTaken: dateTaken.toISOString(),
      width,
      height,
    });
  }

  // Build month-day index for memories lookup
  const byMonthDay = new Map<string, PhotoEntry[]>();
  for (const photo of photos) {
    const d = new Date(photo.dateTaken);
    const key = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!byMonthDay.has(key)) byMonthDay.set(key, []);
    byMonthDay.get(key)!.push(photo);
  }

  const index: PhotoIndex = { photos, byMonthDay, lastScanned: Date.now() };
  photoIndexCache.set(photosDir, index);

  // Also store file path mapping for serving
  filePathMap.clear();
  for (let i = 0; i < imagePaths.length; i++) {
    filePathMap.set(photos[i].id, imagePaths[i]);
  }

  return index;
}

// Map photo IDs to file paths for serving
const filePathMap = new Map<string, string>();

/** Find the photos directory from config or default */
function findPhotosDir(): string {
  let dir = process.cwd();
  while (true) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      return path.join(dir, 'photos');
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.join(process.cwd(), 'photos');
}

export async function photosRoute(fastify: FastifyInstance): Promise<void> {
  // GET /api/photos/memories?dir=<optional>
  fastify.get<{ Querystring: { dir?: string } }>('/api/photos/memories', async (request) => {
    const photosDir = request.query.dir || findPhotosDir();
    const index = await getPhotoIndex(photosDir);

    const now = new Date();
    const todayKey = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todayPhotos = index.byMonthDay.get(todayKey) || [];

    // Group by "N years ago"
    const currentYear = now.getFullYear();
    const memories: Record<string, PhotoEntry[]> = {};

    for (const photo of todayPhotos) {
      const photoYear = new Date(photo.dateTaken).getFullYear();
      if (photoYear === currentYear) continue; // Skip this year's photos
      const yearsAgo = currentYear - photoYear;
      const label = yearsAgo === 1 ? 'Vor 1 Jahr' : `Vor ${yearsAgo} Jahren`;
      if (!memories[label]) memories[label] = [];
      memories[label].push(photo);
    }

    return { memories };
  });

  // GET /api/photos/random?dir=<optional>&count=1
  fastify.get<{ Querystring: { dir?: string; count?: string } }>('/api/photos/random', async (request) => {
    const photosDir = request.query.dir || findPhotosDir();
    const count = Math.min(parseInt(request.query.count || '1', 10) || 1, 20);
    const index = await getPhotoIndex(photosDir);

    if (index.photos.length === 0) {
      return { photo: null };
    }

    if (count === 1) {
      const photo = index.photos[Math.floor(Math.random() * index.photos.length)];
      return { photo };
    }

    // Shuffle and pick N
    const shuffled = [...index.photos].sort(() => Math.random() - 0.5);
    return { photos: shuffled.slice(0, count) };
  });

  // GET /api/photos/file/:id — serve actual image file
  fastify.get<{ Params: { id: string } }>('/api/photos/file/:id', async (request, reply) => {
    const { id } = request.params;
    const filePath = filePathMap.get(id);

    if (!filePath || !fs.existsSync(filePath)) {
      return reply.status(404).send({ error: 'Photo not found' });
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.heic': 'image/heic',
      '.heif': 'image/heif',
      '.tiff': 'image/tiff',
      '.tif': 'image/tiff',
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // For HEIC/HEIF, convert to JPEG for browser compatibility
    if (ext === '.heic' || ext === '.heif') {
      const buffer = await sharp(filePath).jpeg({ quality: 90 }).toBuffer();
      return reply.type('image/jpeg').send(buffer);
    }

    const stream = fs.createReadStream(filePath);
    return reply.type(contentType).send(stream);
  });
}
