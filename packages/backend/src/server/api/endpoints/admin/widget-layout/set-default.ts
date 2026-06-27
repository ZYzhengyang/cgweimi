/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import { MetaService } from '@/core/MetaService.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireAdmin: true,
	kind: 'write:admin:meta',
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		layout: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id: { type: 'string', optional: false, nullable: false },
					name: { type: 'string', optional: false, nullable: false },
					place: { type: 'string', optional: false, nullable: true },
					data: { type: 'object', optional: false, nullable: false },
					layout: {
						type: 'object',
						optional: true, nullable: false,
						properties: {
							x: { type: 'integer', optional: false, nullable: false },
							y: { type: 'integer', optional: false, nullable: false },
							w: { type: 'integer', optional: false, nullable: false },
							h: { type: 'integer', optional: false, nullable: false },
						},
					},
					pinned: { type: 'boolean', optional: true, nullable: false },
				},
			},
		},
	},
	required: ['layout'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.meta)
		private metaService: MetaService,
	) {
		super(meta, paramDef, async (ps) => {
			await this.metaService.update({ defaultWidgetLayout: ps.layout });
		});
	}
}