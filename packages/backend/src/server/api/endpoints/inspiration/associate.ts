/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { HttpRequestService } from '@/core/HttpRequestService.js';
import { MiMeta } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '../../error.js';

export const meta = {
	tags: ['inspiration'],

	requireCredential: false,

	res: {
		type: 'array',
		items: {
			type: 'object',
			properties: {
				zh: { type: 'string' },
				en: { type: 'string', nullable: true },
			},
			required: ['zh'],
		},
	},

	errors: {
		unavailable: {
			message: 'AI inspiration service unavailable.',
			code: 'UNAVAILABLE',
			id: 'a1b2c3d4-5678-9abc-def0-123456789abc',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		keyword: { type: 'string', minLength: 1, maxLength: 100 },
	},
	required: ['keyword'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.meta)
		private serverSettings: MiMeta,

		private httpRequestService: HttpRequestService,
	) {
		super(meta, paramDef, async (ps, _me) => {
			const apiKey = this.serverSettings.deepseekApiKey;
			if (!apiKey) {
				throw new ApiError(meta.errors.unavailable);
			}

			const apiUrl = this.serverSettings.deepseekApiUrl ?? 'https://api.deepseek.com/v1/chat/completions';
			const model = this.serverSettings.deepseekModel ?? 'deepseek-chat';

			const prompt = `你是一个创意联想助手。用户会给你一个关键词，请围绕这个关键词进行创意联想，返回 6-8 个相关的联想词。

要求：
- 联想词要发散、有创意，不要只是同义词
- 每个联想词给出中文和英文
- 返回严格的JSON数组格式，不要包含任何其他文字

示例格式：
[{"zh":"太空","en":"space"},{"zh":"水母","en":"jellyfish"}]

关键词：${ps.keyword}`;

			try {
				const res = await this.httpRequestService.send(apiUrl, {
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${apiKey}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						model,
						messages: [
							{ role: 'user', content: prompt },
						],
						temperature: 0.9,
						max_tokens: 512,
					}),
				});

				const json = (await res.json()) as {
					choices?: { message?: { content?: string } }[];
				};

				const content = json.choices?.[0]?.message?.content ?? '[]';
				// 提取 JSON 数组（兼容 markdown code block 包裹）
				const jsonMatch = content.match(/\[[\s\S]*\]/);
				if (!jsonMatch) return [];

				const words = JSON.parse(jsonMatch[0]) as { zh: string; en?: string }[];
				// 过滤校验
				return words
					.filter(w => typeof w.zh === 'string' && w.zh.length > 0)
					.map(w => ({ zh: w.zh, en: w.en ?? undefined }));
			} catch (err: unknown) {
				console.error('[inspiration/associate] DeepSeek API error:', err);
				return [];
			}
		});
	}
}
