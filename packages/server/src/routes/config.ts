import type { FastifyInstance } from 'fastify';
import { loadConfig } from '../config.js';
import { redactConfigForClient } from '../configRedaction.js';
import { resolveConfigPath } from '../utils/projectRoot.js';
import * as path from 'node:path';
import * as fs from 'node:fs';

export async function configRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: { profile?: string } }>('/api/config', async (request, reply) => {
    const profile = request.query.profile;
    
    // Determine config file based on profile
    let configFile = 'config.json';
    if (profile) {
      // Sanitize profile name to prevent directory traversal
      const safeName = profile.replace(/[^a-zA-Z0-9-_]/g, '');
      configFile = `config.${safeName}.json`;
      
      // Check if profile config exists, fallback to default if not
      const profilePath = resolveConfigPath(configFile);
      if (!fs.existsSync(profilePath)) {
        fastify.log.warn(`Profile config not found: ${configFile}, using default`);
        configFile = 'config.json';
      }
    }
    
    const result = loadConfig(resolveConfigPath(configFile));

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

  // List available profiles
  fastify.get('/api/profiles', async (_request, reply) => {
    try {
      const configDir = path.dirname(resolveConfigPath());
      const files = fs.readdirSync(configDir);
      
      // Find all config.*.json files
      const profiles = files
        .filter(f => f.startsWith('config.') && f.endsWith('.json') && f !== 'config.json')
        .map(f => f.replace('config.', '').replace('.json', ''))
        .sort();
      
      return reply.status(200).send({
        profiles: ['default', ...profiles],
        default: 'default',
      });
    } catch (err) {
      fastify.log.error({ err }, 'Failed to list profiles');
      return reply.status(500).send({
        error: 'Failed to list profiles',
        profiles: ['default'],
        default: 'default',
      });
    }
  });
}
