/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import ms from 'ms';
import { Injectable } from '@nestjs/common';
import { MAX_NOTE_TEXT_LENGTH } from '@/const.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { NoteCreateService } from '@/core/NoteCreateService.js';
import { IdentifiableError } from '@/misc/identifiable-error.js';
import { ApiError } from '../../../error.js';

export const meta = {
	tags: ['notes'],

	requireCredential: true,

	prohibitMoved: true,

	limit: {
		duration: ms('1hour'),
		max: 300,
	},

	kind: 'write:notes',

	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			createdNote: {
				type: 'object',
				optional: false, nullable: false,
				ref: 'Note',
			},
		},
	},

	errors: {
		noSuchReplyTarget: {
			message: 'No such reply target.',
			code: 'NO_SUCH_REPLY_TARGET',
			id: '749ee0f6-d3da-459a-bf02-282e2da4292c',
		},

		cannotReplyToInvisibleNote: {
			message: 'You cannot reply to an invisible Note.',
			code: 'CANNOT_REPLY_TO_AN_INVISIBLE_NOTE',
			id: 'b98980fa-3780-406c-a935-b6d0eeee10d1',
		},

		cannotReplyToPureRenote: {
			message: 'You can not reply to a pure Renote.',
			code: 'CANNOT_REPLY_TO_A_PURE_RENOTE',
			id: '3ac74a84-8fd5-4bb0-870f-01804f82ce15',
		},

		youHaveBeenBlocked: {
			message: 'You have been blocked by this user.',
			code: 'YOU_HAVE_BEEN_BLOCKED',
			id: 'b390d7e1-8a5e-46ed-b625-06271cafd3d3',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		replyId: { type: 'string', format: 'misskey:id' },
		text: {
			type: 'string',
			minLength: 1,
			maxLength: MAX_NOTE_TEXT_LENGTH,
		},
	},
	required: ['replyId', 'text'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		private noteEntityService: NoteEntityService,
		private noteCreateService: NoteCreateService,
	) {
		super(meta, paramDef, async (ps, me) => {
			try {
				const note = await this.noteCreateService.fetchAndCreate(me, {
					createdAt: new Date(),
					fileIds: [],
					poll: null,
					text: ps.text,
					replyId: ps.replyId,
					renoteId: null,
					cw: null,
					localOnly: false,
					reactionAcceptance: null,
					visibility: 'public',
					visibleUserIds: [],
					channelId: null,
				});

				return {
					createdNote: await this.noteEntityService.pack(note, me),
				};
			} catch (err) {
				if (err instanceof IdentifiableError) {
					if (err.id === '60142edb-1519-408e-926d-4f108d27bee0') {
						throw new ApiError(meta.errors.noSuchReplyTarget);
					} else if (err.id === 'f089e4e2-c0e7-4f60-8a23-e5a6bf786b36') {
						throw new ApiError(meta.errors.cannotReplyToPureRenote);
					} else if (err.id === '11cd37b3-a411-4f77-8633-c580ce6a8dce') {
						throw new ApiError(meta.errors.cannotReplyToInvisibleNote);
					} else if (err.id === 'b0df6025-f2e8-44b4-a26a-17ad99104612') {
						throw new ApiError(meta.errors.youHaveBeenBlocked);
					}
				}
				throw err;
			}
		});
	}
}
