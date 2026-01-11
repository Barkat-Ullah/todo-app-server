import catchAsync from '../../utils/catchAsync';
import { prisma } from '../../utils/prisma';
import sendResponse from '../../utils/sendResponse';
import { notificationServices } from './Notification.service';

const sendNotification = catchAsync(async (req: any, res: any) => {
  const notification = await notificationServices.sendSingleNotification(req);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'notification sent successfully',
    data: notification,
  });
});

const sendNotifications = catchAsync(async (req: any, res: any) => {
  const notifications = await notificationServices.sendNotifications(req);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'notifications sent successfully',
    data: notifications,
  });
});

const sendToAdmins = catchAsync(async (req: any, res: any) => {
  const { title, body } = req.body;
  const result = await notificationServices.sendToAdmins(req, title, body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Admins notified',
    data: result,
  });
});

const getAllNotificationsForAdmin = catchAsync(async (req, res) => {
  const result = await notificationServices.adminNotify(req);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Notifications fetched successfully',
    data: result,
  });
});

const getMyNotification = catchAsync(async (req, res) => {
  const userMail = req.user.email;
  const result = await notificationServices.getMyNotifications(userMail);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Notifications fetched successfully',
    data: result.notifications,
  });
});

const getNotifications = catchAsync(async (req: any, res: any) => {
  const notifications = await notificationServices.getNotificationsFromDB(req);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Notifications retrieved successfully',
    data: notifications,
  });
});

const getSingleNotificationById = catchAsync(async (req: any, res: any) => {
  const notificationId = req.params.notificationId;
  const notification = await notificationServices.getSingleNotificationFromDB(
    req,
    notificationId,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Notification retrieved successfully',
    data: notification,
  });
});

export const notificationController = {
  sendNotification,
  sendNotifications,
  getNotifications,
  getSingleNotificationById,
  sendToAdmins,
  getAllNotificationsForAdmin,
  getMyNotification,
};
