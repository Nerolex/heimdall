import type { FastifyInstance } from 'fastify';
import { loadConfig } from '../config.js';
import { redactConfigForClient } from '../configRedaction.js';
import { resolveConfigPath } from '../utils/projectRoot.js';

export async function configRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/config', async (_request, reply) => {
    const result = loadConfig(resolveConfigPath());

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
