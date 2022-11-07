import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import lodash from 'lodash';
import { authenticate } from '../plugins/authenticate';

type UsersLastRequest = FastifyRequest<{
  Params: { take: number };
}>;

export async function userRoutes(fastify: FastifyInstance) {
  fastify.get('/users/count', async () => {
    const count = await prisma.user.count();
    return { count };
  });

  fastify.get('/users/last/:take', async (req: UsersLastRequest, res) => {
    const lastUsers = await prisma.user.findMany({
      take: Number(req.params.take),
      orderBy: { createdAt: 'desc' },
    });
    return lastUsers;
  });

  fastify.get(
    '/pools/:poolId/users/scores',
    async (req: UsersLastRequest, res) => {
      const getUsersParams = z.object({
        poolId: z.string(),
      });

      const { poolId } = getUsersParams.parse(req.params);

      let lastUsers = await prisma.user.findMany({
        where: {
          participatingAt: {
            some: {
              poolId,
            },
          },
        },
        select: {
          id: true,
          name: true,
          avatarURL: true,
          initials: true,
          participatingAt: {
            where: {
              poolId,
            },
            include: {
              scores: true,
            },
          },
        },
      });

      let data = lastUsers.map((user) => ({
        ...user,
        score: lodash.sumBy(
          user.participatingAt[0].scores,
          (x) => x.participantScore
        ),
        participatingAt: undefined,
      }));

      data = lodash.orderBy(data, (x) => x.score, 'desc');

      return data;
    }
  );

  fastify.get('/users/:id', { onRequest: [authenticate] }, async (req, res) => {
    const getUserParams = z.object({
      id: z.string(),
    });

    const { id } = getUserParams.parse(req.params);

    const userRes = await prisma.user.findUnique({
      where: { id },
      select: {
        avatarURL: true,
        email: true,
        name: true,
        createdAt: true,
        id: true,
        initials: true,
      },
    });

    const totalScores = await prisma.score.aggregate({
      _sum: { participantScore: true },
      where: { participant: { userId: id } },
    });

    const totalRightGuesses = await prisma.score.count({
      where: {
        participant: {
          userId: id,
        },
      },
    });

    const totalPools = await prisma.pool.count({
      where: {
        participants: {
          some: {
            userId: id,
          },
        },
      },
    });

    const data = {
      ...userRes,
      totalScore: totalScores._sum.participantScore || 0,
      totalPools,
      totalRightGuesses,
    };

    return data;
  });
}
