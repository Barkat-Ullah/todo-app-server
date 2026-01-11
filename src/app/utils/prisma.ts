import { PrismaClient } from '@prisma/client';
const prismaClient = new PrismaClient({
  omit: {
    user: {
      password: true,
      otp: true,
      otpExpiry: true,
      isEmailVerified: true,
      // isAgreeWithTerms: true,
    },
  },
});

export const prisma = prismaClient;
export const insecurePrisma = new PrismaClient();

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  console.log('Prisma disconnected due to application termination (SIGINT).');
  process.exit(0);
});

export default prisma;
