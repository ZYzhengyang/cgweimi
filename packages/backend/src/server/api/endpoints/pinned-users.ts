/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { IsNull, In } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import type { MiMeta, UsersRepository } from '@/models/_.js';
import * as Acct from '@/misc/acct.js';
import type { MiUser } from '@/models/User.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { DI } from '@/di-symbols.js';

export const meta = {
	tags: ['users'],

	requireCredential: false,

	res: {
		type: 'array',
		optional: false, nullable: false,
		items: {
			type: 'object',
			optional: false, nullable: false,
			ref: 'UserDetailed',
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
		@Inject(DI.meta)
		private serverSettings: MiMeta,

		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		private userEntityService: UserEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const accts = this.serverSettings.pinnedUsers.map(acct => Acct.parse(acct));

			// Avoid N+1: group by host, then issue one query per host with `In(usernameLower)`.
			// Local users (host IS NULL) and remote users (host = string) live in different groups.
			// Remote users are further split by host because the same username can exist on different instances.
			const groupKey = (host: string | null, usernameLower: string) => `${host ?? ''}\0${usernameLower}`;
			const usersByKey = new Map<string, MiUser>();

			const localAccts = accts.filter(a => a.host == null);
			const remoteAccts = accts.filter(a => a.host != null);
			const remoteHosts = [...new Set(remoteAccts.map(a => a.host as string))];

			const hostGroups: Array<{ host: string | null; accts: typeof accts }> = [
				{ host: null, accts: localAccts },
				...remoteHosts.map(host => ({ host, accts: remoteAccts.filter(a => a.host === host) })),
			];

			for (const { host, accts: groupAccts } of hostGroups) {
				if (groupAccts.length === 0) continue;
				const found = await this.usersRepository.findBy({
					usernameLower: In(groupAccts.map(a => a.username.toLowerCase())),
					host: host === null ? IsNull() : host,
				});
				for (const user of found) {
					usersByKey.set(groupKey(user.host, user.usernameLower), user);
				}
			}

			// Preserve the configured order; silently drop entries that no longer resolve.
			const users = accts
				.map(a => usersByKey.get(groupKey(a.host, a.username.toLowerCase())))
				.filter((x): x is MiUser => x != null);

			return await this.userEntityService.packMany(users, me, { schema: 'UserDetailed' });
		});
	}
}
