import * as bcrypt from 'bcrypt';
import config from '../../config';
import { UserRoleEnum } from '@prisma/client';
import prisma from '../utils/prisma';

export const initiateSuperAdmin = async () => {
  const hashedPassword = await bcrypt.hash(
    '12345678',
    Number(config.bcrypt_salt_rounds),
  );
  const payload: any = {
    fullName: 'Super Admin',
    email: 'prohero5500@gmail.com',
    password: hashedPassword,
    role: UserRoleEnum.ADMIN,
    isEmailVerified: true,
    status: 'ACTIVE',
  };

  const isExistUser = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (isExistUser) return;

  await prisma.user.create({
    data: payload,
  });
};
