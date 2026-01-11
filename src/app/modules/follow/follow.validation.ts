import { z } from 'zod';

const createFollowZodSchema = z.object({
  body: z.object({
    // Example fields (customize as needed)
    name: z.string({ required_error: 'Name is required' }),
  }),
});

const updateFollowZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
  }),
});

export const FollowValidation = {
  createFollowZodSchema,
  updateFollowZodSchema,
};
