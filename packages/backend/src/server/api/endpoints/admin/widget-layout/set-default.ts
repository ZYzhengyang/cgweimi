/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
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
					id: { type: 'string' },
					name: { type: 'string' },
					place: { type: 'string', nullable: true },
					data: { type: 'object' },
					layout: {
						type: 'object',
						nullable: false,
						properties: {
							x: { type: 'integer' },
							y: { type: 'integer' },
							w: { type: 'integer' },
							h: { type: 'integer' },
						},
					},
					pinned: { type: 'boolean', nullable: false },
				},
			},
		},
	},
	required: ['layout'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		private metaService: MetaService,
	) {
		super(meta, paramDef, async (ps) => {
			await this.metaService.update({ defaultWidgetLayout: ps.layout });
		});
	}
}
