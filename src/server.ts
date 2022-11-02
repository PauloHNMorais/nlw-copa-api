import Fastify, { FastifyRequest } from 'fastify';
import { PrismaClient } from '@prisma/client';
import cors from '@fastify/cors';
import { z } from 'zod';
import ShortUniqueId from 'short-unique-id';

const prisma = new PrismaClient({
  log: ['query'],
});

// Or you can type your request using
type UsersLastRequest = FastifyRequest<{
  Params: { take: number };
}>;

async function bootstrap() {
  const fastify = Fastify({
    logger: true,
  });

  await fastify.register(cors, {
    origin: true,
  });

  fastify.post('/pools', async (req, res) => {
    const createPoolBody = z.object({
      title: z.string(),
    });

    const { title } = createPoolBody.parse(req.body);

    const generate = new ShortUniqueId({ length: 6 });
    const code = String(generate()).toUpperCase();

    const newPool = await prisma.pool.create({
      data: {
        title,
        code,
      },
    });

    return res.status(201).send(newPool);
  });

  fastify.get('/pools/count', async () => {
    const count = await prisma.pool.count();
    return { count };
  });

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

  fastify.get('/guesses/count', async () => {
    const count = await prisma.guess.count();
    return { count };
  });

  await fastify.listen({ port: 3333, host: '0.0.0.0' });
}

bootstrap();
