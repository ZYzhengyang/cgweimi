import { z } from 'zod';

export const followSchema = z.object({
  userIdToFollow: z.number().int().positive('用户ID必须为正整数'),
});

export type FollowInput = z.infer<typeof followSchema>;
