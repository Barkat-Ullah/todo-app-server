import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRoleEnum } from '@prisma/client';
import { authValidation } from './Auth.validation';
import { AuthControllers } from './Auth.controller';


const router = express.Router();

router.post(
  '/login',

  // validateRequest.body(authValidation.loginUser),
  AuthControllers.loginWithOtp,
);

router.post('/register', AuthControllers.registerWithOtp);
router.post('/logout', AuthControllers.logoutUser);

router.post('/verify-email-with-otp', AuthControllers.verifyOtpCommon);

router.post(
  '/resend-verification-with-otp',
  AuthControllers.resendVerificationWithOtp,
);

router.post(
  '/change-password',
  auth(UserRoleEnum.USER, UserRoleEnum.ADMIN),
  AuthControllers.changePassword,
);

router.post(
  '/forget-password',
  // validateRequest.body(authValidation.forgetPasswordValidationSchema),
  AuthControllers.forgetPassword,
);

router.post(
  '/reset-password',
  // validateRequest.body(authValidation.resetPasswordValidationSchema),
  AuthControllers.resetPassword,
);

export const AuthRouters = router;
