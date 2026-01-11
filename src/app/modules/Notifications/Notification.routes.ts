import express from 'express';
import auth from '../../middlewares/auth';
import { notificationController } from './Notification.controller';
import { UserRoleEnum } from '@prisma/client';

const router = express.Router();

router.post(
  '/send-notification/:userId',
  auth(),
  notificationController.sendNotification,
);

router.post(
  '/send-notification',
  auth(),
  notificationController.sendNotifications,
);

router.post('/send-to-admins', auth(), notificationController.sendToAdmins);

router.get(
  '/admin',
  auth(UserRoleEnum.ADMIN),
  notificationController.getAllNotificationsForAdmin,
);
router.get(
  '/my',
  auth(),
  notificationController.getMyNotification,
);

router.get('/', auth(), notificationController.getNotifications);
router.get(
  '/:notificationId',
  auth(),
  notificationController.getSingleNotificationById,
);

export const notificationsRoute = router;
