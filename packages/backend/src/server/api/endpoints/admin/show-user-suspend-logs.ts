/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { ModerationLogService } from '@/core/ModerationLogService.js';
import { DI } from '@/di-symbols.js';
import { Brackets } from 'typeorm';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		userId: { type: 'string', format: 'misskey:id' },
		limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
		sinceId: { type: 'string', format: 'misskey:id' },
		untilId: { type: 'string', format: 'misskey:id' },
	},
	required: ['userId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		private moderationLogService: ModerationLogService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.moderationLogService.paginationRepository
				.createQueryBuilder('log')
				.andWhere(new Brackets(qb => {
					qb.where('log.info->\'userId\' = :userId', { userId: ps.userId })
						.andWhere(new Brackets(qb2 => {
							qb2.where("log.type = 'suspend'")
								.orWhere("log.type = 'unsuspend'")
								.orWhere("log.type = 'silence'")
								.orWhere("log.type = 'unsilence'");
						}));
				}))
				.orderBy('log.createdAt', 'DESC');

			const logs = await query
				.limit(ps.limit)
				.getMany();

			return logs;
		});
	}
}
