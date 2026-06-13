/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { DanmakusRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { GetterService } from '@/server/api/GetterService.js';
import { ApiError } from '../../../error.js';

export const meta = {
	tags: ['notes'],

	requireCredential: false,

	allowGet: true,

	cacheSec: 60,

	errors: {
		noSuchNote: {
			message: 'No such note.',
			code: 'NO_SUCH_NOTE',
			id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
		},
	},

	res: {
		type: 'array',
		optional: false, nullable: false,
		items: {
			type: 'object',
			optional: false, nullable: false,
			properties: {
				id: { type: 'string', optional: false, nullable: false },
				noteId: { type: 'string', optional: false, nullable: false },
				userId: { type: 'string', optional: false, nullable: false },
				text: { type: 'string', optional: false, nullable: false },
				color: { type: 'string', optional: false, nullable: true },
				time: { type: 'number', optional: false, nullable: false },
				createdAt: { type: 'string', optional: false, nullable: false, format: 'date-time' },
			},
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		noteId: { type: 'string', format: 'misskey:id' },
		limit: { type: 'integer', minimum: 1, maximum: 500, default: 100 },
	},
	required: ['noteId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.danmakusRepository)
		private danmakusRepository: DanmakusRepository,

		private getterService: GetterService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const note = await this.getterService.getNote(ps.noteId).catch(err => {
				if (err.id === '9725d0ce-ba28-4dde-95a7-2cbb2c15de24') throw new ApiError(meta.errors.noSuchNote);
				throw err;
			});

			const danmakus = await this.danmakusRepository.find({
				where: { noteId: note.id },
				order: { time: 'ASC' },
				take: ps.limit,
			});

			return danmakus.map(d => ({
				id: d.id,
				noteId: d.noteId,
				userId: d.userId,
				text: d.text,
				color: d.color,
				time: d.time,
				createdAt: d.createdAt.toISOString(),
			}));
		});
	}
}
