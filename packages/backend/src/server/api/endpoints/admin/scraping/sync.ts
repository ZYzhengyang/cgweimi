/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { ScrapingService } from '@/core/ScrapingService.js';
import { ScrapedContentSource } from '@/models/ScrapedContent.js';

export const meta = {
	requireCredential: true,
	requireAdmin: true,
	tags: ['admin'],

	res: {
		type: 'object',
		properties: {
			total: { type: 'number' },
			success: { type: 'number' },
			failed: { type: 'number' },
			skipped: { type: 'number' },
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		source: {
			type: 'string',
			enum: ['cara', 'youtube', 'artstation'],
		},
	},
	required: ['source'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		private scrapingService: ScrapingService,
	) {
		super(meta, paramDef, async (ps) => {
			const source = ps.source as ScrapedContentSource;
			return await this.scrapingService.syncOnce(source);
		});
	}
}
