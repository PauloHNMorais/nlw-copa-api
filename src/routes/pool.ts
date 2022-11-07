import { Pool } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import ShortUniqueId from 'short-unique-id';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../plugins/authenticate';

export async function poolRoutes(fastify: FastifyInstance) {
  fastify.get('/pools/count', async () => {
    const count = await prisma.pool.count();
    return { count };
  });

  fastify.post('/pools', async (req, res) => {
    const createPoolBody = z.object({
      title: z.string(),
    });

    const { title } = createPoolBody.parse(req.body);

    const generate = new ShortUniqueId({ length: 6 });
    // const code = String(generate()).toUpperCase();

    let code = '';
    let poolExistsByCode;

    do {
      code = String(generate()).toUpperCase();

      poolExistsByCode = await prisma.pool.findUnique({
        where: { code },
      });
    } while (poolExistsByCode);

    try {
      await req.jwtVerify();

      await prisma.pool.create({
        data: {
          title,
          code,
          ownerId: req.user.sub,
          participants: {
            create: {
              userId: req.user.sub,
            },
          },
        },
      });
    } catch (error) {
      await prisma.pool.create({
        data: {
          title,
          code,
        },
      });
    }

    return res.status(201).send({ code });
  });

  fastify.post(
    '/pools/join',
    { onRequest: [authenticate] },
    async (req, res) => {
      const joinPoolBody = z.object({
        code: z.string(),
      });

      const { code } = joinPoolBody.parse(req.body);

      const pool = await prisma.pool.findUnique({
        where: { code },
        include: {
          participants: {
            where: { userId: req.user.sub },
          },
        },
      });

      if (!pool) {
        return res.status(404).send({ message: 'Pool not found' });
      }

      if (pool.participants.length > 0) {
        return res
          .status(404)
          .send({ message: 'You already joined this pool' });
      }

      if (!pool.ownerId) {
        await prisma.pool.update({
          where: {
            id: pool.id,
          },
          data: {
            ownerId: req.user.sub,
          },
        });
      }

      await prisma.participant.create({
        data: {
          poolId: pool.id,
          userId: req.user.sub,
        },
      });

      return res.status(204).send();
    }
  );

  fastify.get('/pools', { onRequest: [authenticate] }, async (req, res) => {
    const pools = await prisma.pool.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      where: {
        participants: {
          some: {
            userId: req.user.sub,
          },
        },
      },
      include: {
        _count: {
          select: {
            participants: true,
          },
        },
        participants: {
          select: {
            id: true,
            user: {
              select: {
                avatarURL: true,
                name: true,
                initials: true,
              },
            },
            createdAt: true,
          },
          take: 4,
        },
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return res.status(200).send(pools);
  });

  fastify.get('/pools/:id', { onRequest: [authenticate] }, async (req, res) => {
    const getPoolParams = z.object({
      id: z.string(),
    });

    const { id } = getPoolParams.parse(req.params);

    const pool = await prisma.pool.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            participants: true,
          },
        },
        participants: {
          include: {
            user: true,
          },
          take: 4,
        },
        owner: true,
      },
    });

    return res.status(200).send(pool);
  });

  fastify.delete(
    '/pools/:id',
    { onRequest: [authenticate] },
    async (req, res) => {
      const deletePoolParams = z.object({
        id: z.string(),
      });

      const { id } = deletePoolParams.parse(req.params);

      await prisma.guess.deleteMany({ where: { participant: { poolId: id } } });
      await prisma.participant.deleteMany({ where: { poolId: id } });
      await prisma.pool.deleteMany({ where: { id } });

      return res.status(204).send();
    }
  );
}
