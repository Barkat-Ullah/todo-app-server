import httpStatus from 'http-status';
import QueryBuilder from '../../builder/QueryBuilder';
import { prisma } from '../../utils/prisma';
import AppError from '../../errors/AppError';
import { UserRoleEnum } from '@prisma/client';

const getAllPayments = async (query: Record<string, any>) => {
  const paymentQuery = new QueryBuilder<typeof prisma.payment>(
    prisma.payment,
    query,
  );
  const result = await paymentQuery
    .search([
      'user.fullName',
      'user.email',
      'product.title',
      'stripePaymentId',
      'stripeSessionId',
    ])
    .filter()
    .sort()
    .customFields({
      id: true,
      amount: true,
      userId: true,
      paymentMethodType: true,
      createdAt: true,
      updatedAt:true,
      status: true,
      stripeCustomerId: true,
      stripePaymentId: true,
      stripeSessionId: true,
      user: {
        select: {
          profile: true,
          fullName: true,
          email: true,
        },
      },
    })
    .exclude()
    .paginate()
    .execute();
  return result;
};

const singleTransactionHistory = async (query: {
  id: string;
  userId?: string;
}) => {
  const result = await prisma.payment.findUnique({
    where: query,
    select: {
      id: true,
      amount: true,
      userId: true,
      paymentMethodType: true,
      createdAt: true,
      stripeCustomerId: true,
      stripePaymentId: true,
      stripeSessionId: true,
      currency: true,
      status: true,
      user: {
        select: {
          profile: true,
          fullName: true,
          email: true,
        },
      },
    },
  });
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Transaction history not found');
  }
  return result;
};
const singleTransactionHistoryBySessionId = async (query: {
  stripeSessionId: string;
  userId?: string;
}) => {
  const result = await prisma.payment.findUnique({
    where: query,
    select: {
      id: true,
      amount: true,
      userId: true,
      paymentMethodType: true,
      createdAt: true,
      stripeCustomerId: true,
      stripePaymentId: true,
      stripeSessionId: true,
      currency: true,
      status: true,

      user: {
        select: {
          profile: true,
          fullName: true,

          email: true,
        },
      },
    },
  });
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Transaction history not found');
  }
  return result;
};

const cancelPayment = async (
  id: string,
  userId: string,
  role: UserRoleEnum,
) => {
  return await prisma.payment.update({
    where: {
      id,
      ...(role !== 'ADMIN' && { userId }),
    },
    data: {
      status: 'CANCELED',
    },
  });
};

export const PaymentService = {
  getAllPayments,
  singleTransactionHistory,
  cancelPayment,
  singleTransactionHistoryBySessionId,
};
