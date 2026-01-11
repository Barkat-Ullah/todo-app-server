import z from 'zod';

const loginUser = z.object({
  body: z.object({
    email: z
      .string({
        required_error: 'Email is required!',
      })
      .email({
        message: 'Invalid email format!',
      }),
    password: z.string({
      required_error: 'Password is required!',
    }),
  }),
});

const registerUser = z.object({
  body: z.object({
    firstName: z.string({
      required_error: 'First Name is required!',
    }),
    lastName: z.string({
      required_error: 'Last Name is required!',
    }),
    email: z
      .string({
        required_error: 'Email is required!',
      })
      .email({
        message: 'Invalid email format!',
      }),
    password: z.string({
      required_error: 'Password is required!',
    }),
  }),
});

const forgetPasswordValidationSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'email is required' })
      .email({ message: 'Use a valid Email' }),
  }),
});

const verifyOtpValidationSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'email is required' })
      .email({ message: 'Use a valid Email' }),
    otp: z.string({ required_error: 'Otp is required.' }),
  }),
});

const verifyTokenValidationSchema = z.object({
  body: z.object({
    token: z.string({ required_error: 'Token is required.' }),
  }),
});

const resetPasswordValidationSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'User email is required!' })
      .trim()
      .email({ message: 'Use a valid Email' }),
    password: z.string({ required_error: 'New Password is required!' }),
  }),
});

export const authValidation = {
  loginUser,
  registerUser,
  forgetPasswordValidationSchema,
  verifyOtpValidationSchema,
  verifyTokenValidationSchema,
  resetPasswordValidationSchema,
};
