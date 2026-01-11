import express from 'express';
import auth from '../../middlewares/auth';
import { UserControllers } from './user.controller';
import validateRequest from '../../middlewares/validateRequest';
import { userValidation } from './user.validation';
import { UserRoleEnum } from '@prisma/client';
import { fileUploader } from '../../utils/fileUploader';

const router = express.Router();

router.get(
  '/',
  auth(UserRoleEnum.ADMIN, UserRoleEnum.USER),
  UserControllers.getAllUsers,
);
router.get(
  '/me',
  auth(UserRoleEnum.ADMIN, UserRoleEnum.USER),
  UserControllers.getMyProfile,
);
router.get('/:id', auth('ANY'), UserControllers.getUserDetails);

router.delete('/soft-delete', auth('ANY'), UserControllers.softDeleteUser);
router.delete(
  '/hard-delete/:id',
  auth(UserRoleEnum.ADMIN),
  UserControllers.hardDeleteUser,
);

router.put(
  '/user-role/:id',
  auth(UserRoleEnum.ADMIN),
  validateRequest.body(userValidation.updateUserRoleSchema),
  UserControllers.updateUserRoleStatus,
);

router.put(
  '/user-status/:id',
  auth(UserRoleEnum.ADMIN),
  validateRequest.body(userValidation.updateUserStatus),
  UserControllers.updateUserStatus,
);
router.put(
  '/approve-user',
  auth(UserRoleEnum.ADMIN),
  UserControllers.updateUserApproval,
);

router.put(
  '/update-user/:id',
  fileUploader.uploadSingle, // "image"
  auth(UserRoleEnum.ADMIN),
  validateRequest.body(userValidation.updateUser),
  UserControllers.updateUser,
);

router.put(
  '/update-profile',
  auth(UserRoleEnum.ADMIN, UserRoleEnum.USER),
  fileUploader.uploadSingle, // "image"
  UserControllers.updateMyProfile,
);

export const UserRouters = router;
