import { Guess } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getNearestValuesByProperty } from '../lib/array';
import { prisma } from '../lib/prisma';
import { authenticate } from '../plugins/authenticate';

const POOL_POINTS = 25;

export async function gameRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/pools/:id/games',
    { onRequest: [authenticate] },
    async (req, res) => {
      const getGamesParams = z.object({
        id: z.string(),
      });

      const { id } = getGamesParams.parse(req.params);

      const games = await prisma.game.findMany({
        orderBy: {
          date: 'asc',
        },
        include: {
          guesses: {
            where: {
              participant: {
                userId: req.user.sub,
                poolId: id,
              },
            },
          },
        },
      });

      const data = games.map((game) => ({
        ...game,
        guess: game.guesses.length ? game.guesses[0] : null,
        guesses: undefined,
      }));

      return data;
    }
  );

  fastify.post(
    '/games/:gameId/finish',
    { onRequest: [authenticate] },
    async (req, res) => {
      const finishGameParams = z.object({
        gameId: z.string(),
      });

      const finishGameBody = z.object({
        firstTeamPoints: z.number().int().min(0),
        secondTeamPoints: z.number().int().min(0),
      });

      const { gameId } = finishGameParams.parse(req.params);

      const { firstTeamPoints, secondTeamPoints } = finishGameBody.parse(
        req.body
      );

      await prisma.game.update({
        where: { id: gameId },
        data: {
          isFinished: true,
          firstTeamResultPoints: firstTeamPoints,
          secondTeamResultPoints: secondTeamPoints,
        },
      });

      const pools = await prisma.pool.findMany({
        where: {
          participants: {
            some: {
              guesses: {
                some: {
                  gameId,
                },
              },
            },
          },
        },
      });

      for (let pool of pools) {
        const participantsCount = await prisma.participant.count({
          where: { poolId: pool.id },
        });

        const guesses = await prisma.guess.findMany({
          where: {
            firstTeamPoints,
            secondTeamPoints,
            gameId,
            participant: {
              poolId: pool.id,
            },
          },
        });

        if (guesses.length) {
          for (let guess of guesses) {
            const participantScore = participantsCount / guesses.length;

            await prisma.score.create({
              data: {
                gameId,
                participantId: guess.participantId,
                participantScore,
              },
            });
          }
        }
      }
    }
  );

  fastify.delete(
    '/games/:id',
    { onRequest: [authenticate] },
    async (req, res) => {
      const deleteGameParams = z.object({
        id: z.string(),
      });

      const { id } = deleteGameParams.parse(req.params);

      await prisma.guess.deleteMany({ where: { gameId: id } });
      await prisma.game.delete({ where: { id } });

      return res.status(204).send();
    }
  );
}
