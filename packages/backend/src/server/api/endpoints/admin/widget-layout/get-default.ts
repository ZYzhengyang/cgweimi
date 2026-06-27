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
	kind: 'read:admin:meta',

	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			layout: {
				type: 'array',
				optional: false, nullable: true,
				items: {
					type: 'object',
					optional: false, nullable: false,
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
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		private metaService: MetaService,
	) {
		super(meta, paramDef, async () => {
			const meta = await this.metaService.fetch(true);
			return {
				layout: meta.defaultWidgetLayout,
			};
		});
	}
}
