import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import { Secret } from 'jsonwebtoken';
import config from '../../config';
import AppError from '../errors/AppError';
import { verifyToken } from '../utils/verifyToken';
import { UserRoleEnum, UserStatus } from '@prisma/client';
import { insecurePrisma } from '../utils/prisma';

type TupleHasDuplicate<T extends readonly unknown[]> = T extends [
  infer F,
  ...infer R,
]
  ? F extends R[number]
    ? true
    : TupleHasDuplicate<R>
  : false;

type NoDuplicates<T extends readonly unknown[]> =
  TupleHasDuplicate<T> extends true ? never : T;

const auth = <T extends readonly (UserRoleEnum | 'ANY')[]>(
  ...roles: NoDuplicates<T> extends never ? never : T
) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization;
      if (!token) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
      }

      const verifyUserToken = verifyToken(
        token,
        config.jwt.access_secret as Secret,
      );

      // Check user is exist
      const user = await insecurePrisma.user.findUnique({
        where: {
          id: verifyUserToken.id,
        },
      });

      if (!user) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
      }
      if (user.isDeleted) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'You are deleted !');
      }
      // if (!user.isApproved) {
      //   throw new AppError(httpStatus.UNAUTHORIZED, 'You are not approved by admin!');
      // }
      if (!user.isEmailVerified) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'You are not verified!');
      }
      if (user.status === UserStatus.SUSPENDED) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'You are suspended!');
      }

      if (user?.profile) {
        verifyUserToken.profile = user?.profile;
      }

      req.user = verifyUserToken;
      if (roles.includes('ANY')) {
        next();
      } else {
        if (roles.length && !roles.includes(verifyUserToken.role)) {
          throw new AppError(httpStatus.FORBIDDEN, 'Forbidden!');
        }
        next();
      }
    } catch (error) {
      next(error);
    }
  };
};

export default auth;
