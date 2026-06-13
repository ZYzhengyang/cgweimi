/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { DanmakusRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { IdService } from '@/core/IdService.js';
import { GetterService } from '@/server/api/GetterService.js';
import { ApiError } from '../../../error.js';

export const meta = {
	tags: ['notes'],

	requireCredential: true,

	kind: 'write:notes',

	errors: {
		noSuchNote: {
			message: 'No such note.',
			code: 'NO_SUCH_NOTE',
			id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		noteId: { type: 'string', format: 'misskey:id' },
		text: { type: 'string', minLength: 1, maxLength: 200 },
		color: { type: 'string', maxLength: 10 },
		time: { type: 'number', minimum: 0 },
	},
	required: ['noteId', 'text', 'time'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.danmakusRepository)
		private danmakusRepository: DanmakusRepository,

		private getterService: GetterService,
		private idService: IdService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const note = await this.getterService.getNote(ps.noteId).catch(err => {
				if (err.id === '9725d0ce-ba28-4dde-95a7-2cbb2c15de24') throw new ApiError(meta.errors.noSuchNote);
				throw err;
			});

			await this.danmakusRepository.insertOne({
				id: this.idService.gen(),
				userId: me.id,
				noteId: note.id,
				text: ps.text,
				color: ps.color ?? null,
				time: ps.time,
			});

			return;
		});
	}
}
