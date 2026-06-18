/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { ScrapingService } from '@/core/ScrapingService.js';
import { ModerationLogService } from '@/core/ModerationLogService.js';
import type { ModerationLogPayloads } from '@/types.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireAdmin: true,
	kind: 'write:admin:scraping',

	res: {
		type: 'object',
		optional: false,
		nullable: false,
		properties: {
			count: {
				type: 'number',
				optional: false,
				nullable: false,
			},
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		id: {
			type: 'array',
			items: { type: 'string' },
			minItems: 1,
		},
	},
	required: ['id'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		private scrapingService: ScrapingService,
		private moderationLogService: ModerationLogService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const ids = ps.id as string[];
			let count = 0;

			for (const id of ids) {
				const updated = await this.scrapingService.update({
					id,
					published: true,
					errorMessage: null,
				});

				if (updated) {
					count++;
					// 记录审核日志
					await this.moderationLogService.log(me, 'approveScrapedContent', {
						scrapedContentId: id,
						source: updated.source,
						author: updated.author,
					} satisfies ModerationLogPayloads['approveScrapedContent']);
				}
			}

			return { count };
		});
	}
}
