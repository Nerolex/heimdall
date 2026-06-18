import * as path from 'node:path';
import * as fs from 'node:fs';

/** Walk up from cwd until a directory containing the given filename is found. Returns the full path to the file. */
export function findFileUpward(filename: string): string {
  let dir = process.cwd();
  while (true) {
    const candidate = path.join(dir, filename);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(process.cwd(), filename);
}

/** Walk up from cwd to find the monorepo root (identified by pnpm-workspace.yaml). */
export function findProjectRoot(): string {
  let dir = process.cwd();
  while (true) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

/**
 * Resolve the config.json path.
 * Honors the HEIMDALL_CONFIG environment variable; falls back to walking up the directory tree.
 * @param filename - Optional config filename (default: 'config.json')
 */
export function resolveConfigPath(filename: string = 'config.json'): string {
  if (process.env.HEIMDALL_CONFIG && filename === 'config.json') {
    return process.env.HEIMDALL_CONFIG;
  }
  return findFileUpward(filename);
}

function sanitizeProfile(profile: string): string {
  return profile.replace(/[^a-zA-Z0-9-_]/g, '');
}

/** Resolve a config file for the active profile, falling back to config.json. */
export function resolveProfileConfigPath(profile?: string, filename: string = 'config.json'): string {
  if (!profile || profile === 'default') {
    return resolveConfigPath(filename);
  }

  const safeName = sanitizeProfile(profile);
  if (!safeName) {
    return resolveConfigPath(filename);
  }

  const profileFile = `config.${safeName}.json`;
  if (process.env.HEIMDALL_CONFIG && filename === 'config.json') {
    return path.join(path.dirname(process.env.HEIMDALL_CONFIG), profileFile);
  }

  return findFileUpward(profileFile);
}
