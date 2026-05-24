import { z } from 'zod';

export const postWriteSchema = z
  .object({
    content: z
      .string()
      .refine((value) => value.trim() !== '', {
        message: '内容不能仅包含空格',
      })
      .optional(),
    // mediaFiles: 字符串数组 (URL或文件路径)
    mediaFiles: z.array(z.string()).optional(),
  })
  .refine((data) => data.content !== undefined || (data.mediaFiles && data.mediaFiles.length > 0), {
    message: '必须提供内容或媒体文件',
  });

export type PostWriteInput = z.infer<typeof postWriteSchema>;
