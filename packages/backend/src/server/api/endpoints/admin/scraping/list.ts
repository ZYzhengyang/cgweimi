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
		type: 'array',
		items: {
			type: 'object',
			properties: {
				id: { type: 'string' },
				source: { type: 'string' },
				sourceId: { type: 'string' },
				author: { type: 'string' },
				authorUrl: { type: 'string', nullable: true },
				content: { type: 'string', nullable: true },
				imageUrls: { type: 'array', items: { type: 'string' } },
				cosUrls: { type: 'array', items: { type: 'string' } },
				tags: { type: 'array', items: { type: 'string' } },
				category: { type: 'string', nullable: true },
				published: { type: 'boolean' },
				publishedNoteId: { type: 'string', nullable: true },
				errorMessage: { type: 'string', nullable: true },
				createdAt: { type: 'string' },
				updatedAt: { type: 'string' },
			},
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		source: {
			type: 'string',
			enum: ['cara', 'youtube', 'artstation'],
			nullable: true,
		},
		published: {
			type: 'boolean',
			nullable: true,
		},
		limit: {
			type: 'number',
			default: 20,
			minimum: 1,
			maximum: 100,
		},
		offset: {
			type: 'number',
			default: 0,
			minimum: 0,
		},
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		private scrapingService: ScrapingService,
	) {
		super(meta, paramDef, async (ps) => {
			const source = ps.source as ScrapedContentSource | null | undefined;
			const published = ps.published ?? undefined;

			const items = await this.scrapingService.list({
				source: source,
				published: published,
				limit: ps.limit,
				offset: ps.offset,
			});

			return items.map(item => ({
				id: item.id,
				source: item.source,
				sourceId: item.sourceId,
				author: item.author,
				authorUrl: item.authorUrl,
				content: item.content,
				imageUrls: item.imageUrls,
				cosUrls: item.cosUrls,
				tags: item.tags,
				category: item.category,
				published: item.published,
				publishedNoteId: item.publishedNoteId,
				errorMessage: item.errorMessage,
				createdAt: item.createdAt.toISOString(),
				updatedAt: item.updatedAt.toISOString(),
			}));
		});
	}
}
