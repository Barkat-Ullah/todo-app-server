import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { PaymentService } from './payment.service';

const getAllForAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.getAllPayments(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All payments retrieved successfully (Admin)',
    ...result
  });
});

const getAllForUser = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const query = { ...req.query, userId };

  const result = await PaymentService.getAllPayments(query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All payments retrieved successfully (User)',
    ...result
  });
});

const getSingleForAdmin = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await PaymentService.singleTransactionHistory({ id });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Single payment retrieved successfully (Admin)',
    data: result,
  });
});

const getSingleForUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  const result = await PaymentService.singleTransactionHistory({ id, userId });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Single payment retrieved successfully (User)',
    data: result,
  });
});
const singleTransactionHistoryBySessionId = catchAsync(async (req: Request, res: Response) => {
  const { stripeSessionId } = req.params;
  const userId = req.user?.id;

  const result = await PaymentService.singleTransactionHistoryBySessionId({ stripeSessionId, userId });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Single payment retrieved successfully (User)',
    data: result,
  });
});

const cancelPayment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const role = req.user.role

  const result = await PaymentService.cancelPayment(id, userId, role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment Cancel Successfully',
    data: result,
  });
});

export const PaymentController = {
  getAllForAdmin,
  getAllForUser,
  getSingleForAdmin,
  getSingleForUser,
  cancelPayment,
  singleTransactionHistoryBySessionId
};
