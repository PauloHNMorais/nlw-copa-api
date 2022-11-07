import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import fetch from 'node-fetch';
import { prisma } from '../lib/prisma';
import { authenticate } from '../plugins/authenticate';

export async function scoreRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/pools/:poolId/scores',
    { onRequest: [authenticate] },
    async (req, res) => {
      const getGamesParams = z.object({
        poolId: z.string(),
      });

      const { poolId } = getGamesParams.parse(req.params);

      const participant = await prisma.participant.findUnique({
        where: {
          userId_poolId: {
            userId: req.user.sub,
            poolId,
          },
        },
      });

      if (!participant) {
        return res
          .status(400)
          .send({ message: 'You are not a participant from this pool' });
      }

      const data = await prisma.score.findMany({
        where: {
          participantId: participant.id,
          participant: {
            poolId,
          },
        },
      });

      return data;
    }
  );
}
