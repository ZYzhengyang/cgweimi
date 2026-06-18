/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { UsersRepository } from '@/models/_.js';
import type { MiUser } from '@/models/User.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { DI } from '@/di-symbols.js';
import { ModerationLogService } from '@/core/ModerationLogService.js';
import { bindThis } from '@/decorators.js';

@Injectable()
export class UserSilenceService {
	constructor(
		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		private globalEventService: GlobalEventService,
		private moderationLogService: ModerationLogService,
	) {
	}

	@bindThis
	public async silence(user: MiUser, moderator: MiUser, reason?: string | null, expiresAt?: Date | null): Promise<void> {
		await this.usersRepository.update(user.id, {
			isSilenced: true,
		});

		this.moderationLogService.log(moderator, 'silence', {
			userId: user.id,
			userUsername: user.username,
			userHost: user.host,
			reason: reason,
			expiresAt: expiresAt ? expiresAt.toISOString() : null,
			isUnsilence: false,
		});

		this.globalEventService.publishInternalEvent('userChangeSuspendedState', { id: user.id, isSilenced: true });
	}

	@bindThis
	public async unsilence(user: MiUser, moderator: MiUser, reason?: string | null): Promise<void> {
		await this.usersRepository.update(user.id, {
			isSilenced: false,
		});

		this.moderationLogService.log(moderator, 'unsilence', {
			userId: user.id,
			userUsername: user.username,
			userHost: user.host,
			reason: reason,
			isUnsilence: true,
		});

		this.globalEventService.publishInternalEvent('userChangeSuspendedState', { id: user.id, isSilenced: false });
	}
}
