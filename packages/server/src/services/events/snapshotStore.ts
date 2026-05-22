import * as fs from 'node:fs/promises';
import type { EventsViewSnapshot } from '@heimdall/shared';

const store = new Map<string, EventsViewSnapshot>();

function makeKey(city: string, viewType: string): string {
  return `${city}:${viewType}`;
}

export function getSnapshot(city: string, viewType: string): EventsViewSnapshot | undefined {
  return store.get(makeKey(city, viewType));
}

export function setSnapshot(city: string, viewType: string, snapshot: EventsViewSnapshot): void {
  store.set(makeKey(city, viewType), snapshot);
}

export async function persistToDisk(filePath: string): Promise<void> {
  try {
    const obj: Record<string, EventsViewSnapshot> = {};
    for (const [key, val] of store.entries()) {
      obj[key] = val;
    }
    const dir = filePath.substring(0, filePath.lastIndexOf('/'));
    if (dir) {
      await fs.mkdir(dir, { recursive: true });
    }
    await fs.writeFile(filePath, JSON.stringify(obj, null, 2), 'utf-8');
  } catch {
    // best-effort, swallow errors
  }
}

export async function loadFromDisk(filePath: string): Promise<void> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const obj = JSON.parse(raw) as Record<string, EventsViewSnapshot>;
    for (const [key, val] of Object.entries(obj)) {
      store.set(key, val);
    }
  } catch {
    // best-effort, swallow errors
  }
}
