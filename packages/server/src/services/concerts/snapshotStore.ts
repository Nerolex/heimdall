/**
 * In-memory + persisted snapshot storage for concerts
 */

import type { ConcertsViewSnapshot } from '@heimdall/shared';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let snapshot: ConcertsViewSnapshot | null = null;

const SNAPSHOT_FILE = path.resolve(__dirname, '../../../data/concerts-snapshot.json');

/**
 * Load snapshot from disk on startup
 */
export function loadSnapshotFromDisk(): void {
  try {
    if (fs.existsSync(SNAPSHOT_FILE)) {
      const data = fs.readFileSync(SNAPSHOT_FILE, 'utf-8');
      snapshot = JSON.parse(data);
      console.log('[concerts] Loaded snapshot from disk:', snapshot?.concerts.length || 0, 'concerts');
    }
  } catch (error) {
    console.error('[concerts] Failed to load snapshot from disk:', error);
  }
}

/**
 * Save snapshot to memory and disk
 */
export function saveSnapshot(newSnapshot: ConcertsViewSnapshot): void {
  snapshot = newSnapshot;
  try {
    const dir = path.dirname(SNAPSHOT_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(newSnapshot, null, 2), 'utf-8');
    console.log('[concerts] Saved snapshot:', newSnapshot.concerts.length, 'concerts');
  } catch (error) {
    console.error('[concerts] Failed to save snapshot to disk:', error);
  }
}

/**
 * Get current snapshot
 */
export function getSnapshot(): ConcertsViewSnapshot | null {
  return snapshot;
}
