import type { FastifyInstance } from 'fastify';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { loadConfig } from '../config.js';
import { redactConfigForClient } from '../configRedaction.js';

/** Walk up from cwd to find config.json (handles running from a sub-package). */
function findConfigFile(): string {
  let dir = process.cwd();
  while (true) {
    const candidate = path.join(dir, 'config.json');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(process.cwd(), 'config.json');
}

export async function configRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/config', async (_request, reply) => {
    const configPath = process.env.HEIMDALL_CONFIG || findConfigFile();
    const result = loadConfig(configPath);

    if (result.error === 'config_not_found') {
      return reply.status(404).send({
        error: 'config_not_found',
        message: result.message,
      });
    }

    if (result.error === 'config_invalid') {
      return reply.status(422).send({
        error: 'config_invalid',
        message: result.message,
      });
    }

    const shouldRedact = process.env.HEIMDALL_REDACT_CONFIG === 'true';
    const payload = shouldRedact ? redactConfigForClient(result.config!) : result.config;
    return reply.status(200).send(payload);
  });
}
