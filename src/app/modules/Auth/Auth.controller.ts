import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AuthServices } from './Auth.service';

const loginWithOtp = catchAsync(async (req, res) => {
  const result = await AuthServices.loginWithOtpFromDB(res, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'User logged in successfully',
    data: result,
  });
});

const registerWithOtp = catchAsync(async (req, res) => {
  const result = await AuthServices.registerWithOtpIntoDB(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'User Created Successfully',
    data: result,
  });
});

const logoutUser = catchAsync(async (req, res) => {
  // Clear the token cookie
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User Successfully logged out',
    data: null,
  });
});



const resendVerificationWithOtp = catchAsync(async (req, res) => {
  const email = req.body.email;
  const result = await AuthServices.resendVerificationWithOtp(email);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Verification OTP sent successfully',
    data: result,
  });
});

const changePassword = catchAsync(async (req, res) => {
  const user = req.user;
  const result = await AuthServices.changePassword(user, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Password changed successfully',
    data: result,
  });
});

const forgetPassword = catchAsync(async (req, res) => {
  const result = await AuthServices.forgetPassword(req.body.email);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Verification OTP has sent to email',
    data: result,
  });
});


const verifyOtpCommon = catchAsync(async (req, res) => {
  const result = await AuthServices.verifyOtpCommon(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: result.message,
    data: result,
  });
});

const resetPassword = catchAsync(async (req, res) => {
  await AuthServices.resetPassword(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Password Reset!',
    data: null,
  });
});

export const AuthControllers = {
  loginWithOtp,
  registerWithOtp,
  logoutUser,
  resendVerificationWithOtp,
  changePassword,
  forgetPassword,
  verifyOtpCommon,
  resetPassword,
};
