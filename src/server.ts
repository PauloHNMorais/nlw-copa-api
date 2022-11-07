import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { poolRoutes } from './routes/pool';
import { userRoutes } from './routes/user';
import { guessRoutes } from './routes/guess';
import { authRoutes } from './routes/auth';
import { gameRoutes } from './routes/game';
import { scoreRoutes } from './routes/score';

const port = process.env.PORT ? Number(process.env.PORT) : 3333;

async function bootstrap() {
  const fastify = Fastify({
    logger: true,
  });

  await fastify.register(jwt, { secret: String(process.env.JWT_SECRET) });
  await fastify.register(cors, { origin: true });
  await fastify.register(authRoutes);
  await fastify.register(gameRoutes);
  await fastify.register(guessRoutes);
  await fastify.register(poolRoutes);
  await fastify.register(scoreRoutes);
  await fastify.register(userRoutes);

  await fastify.listen({ port, host: '0.0.0.0' });
}

bootstrap();
