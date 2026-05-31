import { type FastifyInstance } from 'fastify';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import sharp from 'sharp';
import type { PhotoEntry } from '@heimdall/shared';

const SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.tiff', '.tif']);

// Cache directory for converted HEIC files
const CACHE_DIR = path.join(process.env.CACHE_DIR || '/tmp', 'heimdall-photo-cache');
// Bump this version to invalidate stale cached HEIC conversions on deployed servers
const CACHE_VERSION = 'v5';
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

function cacheKey(filePath: string, suffix: string): string {
  const stat = fs.statSync(filePath);
  return crypto
    .createHash('md5')
    .update(`${filePath}:${stat.mtimeMs}:${suffix}`)
    .digest('hex');
}

/**
 * Parse heif-info output to get the HEIC container-level irot transform.
 * Returns pixel dimensions and the CCW rotation angle, or null on failure.
 * heif-info is available on Linux via the libheif-examples apt package.
 */
function readHeifInfo(filePath: string): { pixelWidth: number; pixelHeight: number; angleCcw: number } | null {
  try {
    const output = execSync(`heif-info "${filePath}"`, { stdio: 'pipe' }).toString();
    const sizeMatch = output.match(/image:\s*(\d+)x(\d+)/);
    const angleMatch = output.match(/angle \(ccw\):\s*(\d+)/);
    if (!sizeMatch) return null;
    return {
      pixelWidth: parseInt(sizeMatch[1], 10),
      pixelHeight: parseInt(sizeMatch[2], 10),
      angleCcw: angleMatch ? parseInt(angleMatch[1], 10) : 0,
    };
  } catch {
    return null;
  }
}

/**
 * Compute the expected display dimensions after applying the irot transform.
 * 90° and 270° CCW rotations swap width and height; 0° and 180° do not.
 */
function applyIrotToDims(
  pixelWidth: number,
  pixelHeight: number,
  angleCcw: number
): { width: number; height: number } {
  return angleCcw === 90 || angleCcw === 270
    ? { width: pixelHeight, height: pixelWidth }
    : { width: pixelWidth, height: pixelHeight };
}

/**
 * Fix output orientation when heif-convert dropped the irot transform (ARM64 libheif 1.15.1 bug).
 *
 * On ARM64 Linux with libheif ≤ 1.15.1, heif-convert may output landscape pixels for photos
 * that should be portrait (or vice versa) because it ignores the container-level irot box.
 * sharp().rotate() cannot fix this because the output JPEG carries no EXIF orientation tag.
 *
 * We detect the mismatch by comparing the actual output dimensions against the expected
 * display dimensions derived from heif-info (pixel dims + irot angle). When they are
 * swapped we apply the corrective rotation.
 */
async function fixHeifConvertOrientation(
  buffer: Buffer,
  heifInfo: { pixelWidth: number; pixelHeight: number; angleCcw: number }
): Promise<Buffer> {
  const expected = applyIrotToDims(heifInfo.pixelWidth, heifInfo.pixelHeight, heifInfo.angleCcw);
  const outMeta = await sharp(buffer).metadata();
  const outWidth = outMeta.width ?? 0;
  const outHeight = outMeta.height ?? 0;

  const expectPortrait = expected.height > expected.width;
  const outPortrait = outHeight > outWidth;
  if (expectPortrait === outPortrait) return buffer; // Orientation correct — nothing to do

  // Output aspect ratio is inverted vs expected: apply corrective rotation.
  // Expected portrait but got landscape → rotate 90° CCW (270° CW).
  // Expected landscape but got portrait → rotate 90° CW (90° CW).
  const degrees = expectPortrait ? 270 : 90;
  return await sharp(buffer).rotate(degrees).jpeg({ quality: 90 }).toBuffer();
}

/** Convert HEIC/HEIF to JPEG, returning the JPEG buffer. Uses cache. */
async function convertHeicToJpeg(filePath: string): Promise<Buffer> {
  const hash = cacheKey(filePath, 'heic-jpeg');
  const cachedPath = path.join(CACHE_DIR, `${CACHE_VERSION}-${hash}.jpg`);

  // Return cached conversion if available
  if (fs.existsSync(cachedPath)) {
    return fs.readFileSync(cachedPath);
  }

  // Try sharp first (works on x86, may fail on arm64)
  try {
    const buffer = await sharp(filePath).rotate().jpeg({ quality: 90 }).toBuffer();
    fs.writeFileSync(cachedPath, buffer);
    return buffer;
  } catch {
    // Fall back to heif-convert CLI tool
  }

  // heif-info (from libheif-examples) is available on the same Linux systems that have heif-convert.
  // Read it before conversion so we can detect and fix any dropped irot transform below.
  const heifInfo = readHeifInfo(filePath);

  try {
    const tmpPath = cachedPath + '.tmp.jpg';
    execSync(`heif-convert -q 90 "${filePath}" "${tmpPath}"`, { stdio: 'pipe' });
    // Apply EXIF rotation first (handles any orientation tag heif-convert wrote)
    let buffer = await sharp(tmpPath).rotate().jpeg({ quality: 90 }).toBuffer();
    fs.unlinkSync(tmpPath);
    // Then fix any dropped irot transforms (ARM64 libheif 1.15.1 bug)
    if (heifInfo) buffer = await fixHeifConvertOrientation(buffer, heifInfo);
    fs.writeFileSync(cachedPath, buffer);
    return buffer;
  } catch {
    // fall through to next converter
  }

  try {
    // sips is available on macOS — use it as a final fallback
    const tmpPath = cachedPath + '.tmp.jpg';
    execSync(`sips -s format jpeg "${filePath}" --out "${tmpPath}"`, { stdio: 'pipe' });
    // sips bakes the irot into pixels and strips the orientation tag — no further correction needed
    const buffer = await sharp(tmpPath).rotate().jpeg({ quality: 90 }).toBuffer();
    fs.writeFileSync(cachedPath, buffer);
    fs.unlinkSync(tmpPath);
    return buffer;
  } catch {
    throw new Error(`Cannot convert HEIC file: ${filePath}`);
  }
}

type OutputFormat = {
  format: 'jpeg' | 'png' | 'webp';
  contentType: string;
  ext: string;
};

function outputFormatFor(ext: string): OutputFormat {
  if (ext === '.png') {
    return { format: 'png', contentType: 'image/png', ext: 'png' };
  }
  if (ext === '.webp') {
    return { format: 'webp', contentType: 'image/webp', ext: 'webp' };
  }
  return { format: 'jpeg', contentType: 'image/jpeg', ext: 'jpg' };
}

/**
 * Return an auto-oriented image buffer when orientation normalization is needed.
 * Returns null when raw streaming is safe (no EXIF orientation or already correct).
 *
 * For HEIC/HEIF files this always converts to JPEG.
 * For JPEG/PNG/WEBP files:
 *   - Reads the EXIF orientation tag via sharp.metadata().
 *   - If orientation is missing or 1 (upper-left), serves the file as-is so
 *     the browser can apply its own image-orientation: from-image behaviour.
 *   - If orientation is 2–8, applies sharp().rotate() to bake the correction into
 *     the pixels and strips the EXIF orientation tag, then caches the result.
 *   - If metadata reading fails (e.g. unusual encoding), still attempts a
 *     best-effort rotate() in case sharp can correct orientation without metadata.
 */
async function normalizeOrientationIfNeeded(filePath: string, ext: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (ext === '.heic' || ext === '.heif') {
    return { buffer: await convertHeicToJpeg(filePath), contentType: 'image/jpeg' };
  }

  let orientation: number | undefined;
  let metadataFailed = false;
  try {
    orientation = (await sharp(filePath).metadata()).orientation;
  } catch {
    metadataFailed = true;
  }

  // Serve raw when no rotation is needed and metadata read succeeded
  if (!metadataFailed && (!orientation || orientation === 1)) {
    return null;
  }

  // When metadata failed, only try the cached/processed path – if it already exists,
  // return it; otherwise attempt a best-effort rotate and cache the result.
  const output = outputFormatFor(ext);
  const suffix = metadataFailed ? `force-orient-${output.ext}` : `auto-orient-${output.ext}`;
  const hash = cacheKey(filePath, suffix);
  const cachedPath = path.join(CACHE_DIR, `${CACHE_VERSION}-${hash}.${output.ext}`);
  if (fs.existsSync(cachedPath)) {
    return { buffer: fs.readFileSync(cachedPath), contentType: output.contentType };
  }

  try {
    const pipeline = sharp(filePath).rotate();
    let buffer: Buffer;
    if (output.format === 'jpeg') {
      buffer = await pipeline.jpeg({ quality: 90 }).toBuffer();
    } else if (output.format === 'png') {
      buffer = await pipeline.png().toBuffer();
    } else {
      buffer = await pipeline.webp({ quality: 90 }).toBuffer();
    }
    fs.writeFileSync(cachedPath, buffer);
    return { buffer, contentType: output.contentType };
  } catch {
    // sharp cannot process this file at all — serve raw and rely on browser CSS
    return null;
  }
}

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
    // sharp may fail on HEIC (arm64), try exiftool or fall through to mtime
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
      // For 90°/270° rotations (orientations 5–8) the stored pixel dimensions are
      // swapped relative to what the corrected image will look like; fix that here
      // so callers get the logical display dimensions.
      const orient = meta.orientation ?? 1;
      if (orient >= 5 && orient <= 8 && width !== undefined && height !== undefined) {
        [width, height] = [height, width];
      }
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

  // Update file path mapping without a clear→repopulate gap that would cause 404s.
  // Add/update entries for all current photos, then prune stale ones.
  const newIds = new Set<string>();
  for (let i = 0; i < imagePaths.length; i++) {
    newIds.add(photos[i].id);
    filePathMap.set(photos[i].id, imagePaths[i]);
  }
  for (const id of filePathMap.keys()) {
    if (!newIds.has(id)) filePathMap.delete(id);
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
      const label = yearsAgo === 1 ? 'Heute vor 1 Jahr' : `Heute vor ${yearsAgo} Jahren`;
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

  // GET /api/photos/timeline?id=<photoId>&count=5&dir=<optional>
  // Returns N photos before and N photos after the given photo, sorted by dateTaken
  fastify.get<{ Querystring: { id: string; count?: string; dir?: string } }>('/api/photos/timeline', async (request) => {
    const { id, dir: dirParam } = request.query;
    const count = Math.min(parseInt(request.query.count || '5', 10) || 5, 20);
    const photosDir = dirParam || findPhotosDir();
    const index = await getPhotoIndex(photosDir);

    // Sort all photos by date
    const sorted = [...index.photos].sort(
      (a, b) => new Date(a.dateTaken).getTime() - new Date(b.dateTaken).getTime()
    );

    const centerIdx = sorted.findIndex(p => p.id === id);
    if (centerIdx === -1) {
      return { photos: [], centerIndex: 0 };
    }

    const start = Math.max(0, centerIdx - count);
    const end = Math.min(sorted.length, centerIdx + count + 1);
    const photos = sorted.slice(start, end);
    const centerInSlice = centerIdx - start;

    return { photos, centerIndex: centerInSlice };
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

    const normalized = await normalizeOrientationIfNeeded(filePath, ext);
    if (normalized) {
      return reply.type(normalized.contentType).send(normalized.buffer);
    }

    // Serve raw stream when orientation normalization is not needed.
    const stream = fs.createReadStream(filePath);
    return reply.type(contentType).send(stream);
  });
}
