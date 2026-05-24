import { z } from 'zod';

export const commentWriteSchema = z.object({
  content: z.string().refine((value) => value.trim().length > 0, {
    message: '评论内容不能为空或仅包含空格',
  }),
});

export type CommentWriteInput = z.infer<typeof commentWriteSchema>;
