import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import fetch from 'node-fetch';
import { prisma } from '../lib/prisma';
import { authenticate } from '../plugins/authenticate';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.get('/me', { onRequest: [authenticate] }, async (req, res) => {
    const userRes = await prisma.user.findUnique({
      where: { id: req.user.sub },
    });

    const userData = {
      ...req.user,
      initials: userRes?.initials,
    };

    return userData;
  });

  fastify.post('/users', async (req, res) => {
    const createUserBody = z.object({
      access_token: z.string(),
    });

    const { access_token } = createUserBody.parse(req.body);

    const userResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    const userData = await userResponse.json();

    const userInfoSchema = z.object({
      id: z.string(),
      email: z.string().email(),
      name: z.string(),
      picture: z.string().url(),
    });

    const userInfo = userInfoSchema.parse(userData);

    let user = await prisma.user.findUnique({
      where: {
        googleId: userInfo.id,
      },
    });

    if (!user) {
      const initials = userInfo.name
        .split(' ')
        .map((item) => item[0])
        .filter((x) => x);

      user = await prisma.user.create({
        data: {
          googleId: userInfo.id,
          name: userInfo.name,
          email: userInfo.email,
          avatarURL: userInfo.picture,
          initials:
            initials.length > 1
              ? initials[0] + initials[initials.length - 1]
              : initials[0],
        },
      });
    }

    const token = fastify.jwt.sign(
      {
        name: user.name,
        avatarURL: user.avatarURL,
      },
      {
        sub: user.id,
        expiresIn: '3 days',
      }
    );

    return { token };
  });
}
