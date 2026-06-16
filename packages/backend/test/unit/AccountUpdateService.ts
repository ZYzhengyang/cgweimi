/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';

import { CoreModule } from '@/core/CoreModule.js';
import { AccountUpdateService } from '@/core/AccountUpdateService.js';
import { GlobalModule } from '@/GlobalModule.js';
import { DI } from '@/di-symbols.js';
import { ApDeliverManagerService } from '@/core/activitypub/ApDeliverManagerService.js';
import { ApRendererService } from '@/core/activitypub/ApRendererService.js';
import { RelayService } from '@/core/RelayService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import type { UsersRepository } from '@/models/_.js';
import type { MiLocalUser, MiRemoteUser } from '@/models/User.js';

const localUser = { id: 'u1', host: null, username: 'alice' } as unknown as MiLocalUser;
const remoteUser = { id: 'u2', host: 'other.tld', username: 'bob' } as unknown as MiRemoteUser;

describe('AccountUpdateService', () => {
	let app: TestingModule;
	let accountUpdateService: AccountUpdateService;
	let usersRepository: UsersRepository;
	let userEntityService: UserEntityService;
	let apRendererService: ApRendererService;
	let apDeliverManagerService: ApDeliverManagerService;
	let relayService: RelayService;

	beforeAll(async () => {
		app = await Test.createTestingModule({
			imports: [GlobalModule, CoreModule],
		}).compile();
		accountUpdateService = app.get<AccountUpdateService>(AccountUpdateService);
		usersRepository = app.get<UsersRepository>(DI.usersRepository);
		userEntityService = app.get<UserEntityService>(UserEntityService);
		apRendererService = app.get<ApRendererService>(ApRendererService);
		apDeliverManagerService = app.get<ApDeliverManagerService>(ApDeliverManagerService);
		relayService = app.get<RelayService>(RelayService);
	});

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	describe('publishToFollowers', () => {
		test('正常系: ローカルユーザーの場合 AP Update を配信する', async () => {
			vi.spyOn(usersRepository, 'findOneBy').mockResolvedValue(localUser);
			vi.spyOn(userEntityService, 'isLocalUser').mockReturnValue(true);
			vi.spyOn(userEntityService, 'isRemoteUser').mockReturnValue(false);
			const renderPerson = vi.fn().mockResolvedValue({ id: 'person' });
			const renderUpdate = vi.fn().mockReturnValue({ update: '1' });
			const addContext = vi.fn().mockReturnValue({ withContext: true });
			vi.spyOn(apRendererService, 'renderPerson').mockImplementation(renderPerson);
			vi.spyOn(apRendererService, 'renderUpdate').mockImplementation(renderUpdate);
			vi.spyOn(apRendererService, 'addContext').mockImplementation(addContext);
			const deliverSpy = vi.spyOn(apDeliverManagerService, 'deliverToFollowers').mockReturnValue(undefined as any);
			const relaySpy = vi.spyOn(relayService, 'deliverToRelays').mockReturnValue(undefined as any);

			await accountUpdateService.publishToFollowers('u1');

			expect(usersRepository.findOneBy).toHaveBeenCalledWith({ id: 'u1' });
			expect(renderPerson).toHaveBeenCalledWith(localUser);
			expect(renderUpdate).toHaveBeenCalledWith({ id: 'person' }, localUser);
			expect(addContext).toHaveBeenCalledWith({ update: '1' });
			expect(deliverSpy).toHaveBeenCalledWith(localUser, { withContext: true });
			expect(relaySpy).toHaveBeenCalledWith(localUser, { withContext: true });
		});

		test('異常系: ユーザーが存在しない場合はエラー', async () => {
			vi.spyOn(usersRepository, 'findOneBy').mockResolvedValue(null);

			await expect(accountUpdateService.publishToFollowers('no-such-user')).rejects.toThrow('user not found');
		});

		test('異常系: ユーザーの場合 AP 配信しない (リモートユーザーはスキップ)', async () => {
			vi.spyOn(usersRepository, 'findOneBy').mockResolvedValue(remoteUser);
			vi.spyOn(userEntityService, 'isLocalUser').mockReturnValue(false);
			const deliverSpy = vi.spyOn(apDeliverManagerService, 'deliverToFollowers').mockReturnValue(undefined as any);
			const relaySpy = vi.spyOn(relayService, 'deliverToRelays').mockReturnValue(undefined as any);

			await accountUpdateService.publishToFollowers('u2');

			expect(deliverSpy).not.toHaveBeenCalled();
			expect(relaySpy).not.toHaveBeenCalled();
		});
	});
});
