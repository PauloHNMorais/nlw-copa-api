import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.create({
    data: {
      name: 'Paulo Henrique',
      email: 'paulohnevesm37@gmail.com',
      avatarURL: 'https://github.com/PauloHNMorais.png',
    },
  });

  const pool = await prisma.pool.create({
    data: {
      title: 'Pool Example',
      code: 'POOL01',
      ownerId: user.id,
      participants: {
        create: {
          userId: user.id,
        },
      },
    },
  });

  const game1 = await prisma.game.create({
    data: {
      date: '2022-11-02T16:00:00.201Z',
      firstTeamCountryCode: 'DE',
      secondTeamCountryCode: 'BR',
    },
  });

  const game2 = await prisma.game.create({
    data: {
      date: '2022-11-02T16:00:00.201Z',
      firstTeamCountryCode: 'BR',
      secondTeamCountryCode: 'AR',
      guesses: {
        create: {
          firstTeamPoints: 2,
          secondTeamPoints: 1,
          participant: {
            connect: {
              userId_poolId: {
                userId: user.id,
                poolId: pool.id,
              },
            },
          },
        },
      },
    },
  });
}

main();
