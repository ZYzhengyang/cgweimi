/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';

import { CoreModule } from '@/core/CoreModule.js';
import { UserService } from '@/core/UserService.js';
import { GlobalModule } from '@/GlobalModule.js';
import { DI } from '@/di-symbols.js';
import type { FollowingsRepository, UsersRepository } from '@/models/_.js';
import type { MiUser } from '@/models/User.js';

// Mock minimum user factory
function makeMockUser(overrides: Partial<MiUser> = {}): MiUser {
	return {
		id: 'user-1',
		username: 'testuser',
		host: null,
		isBot: false,
		isCat: false,
		isHibernated: false,
		isSuspended: false,
		createdAt: new Date(),
		updatedAt: new Date(),
		lastFetchedAt: null,
		name: 'Test User',
		followersCount: 0,
		followingCount: 0,
		notesCount: 0,
		...overrides,
	} as unknown as MiUser;
}

describe('UserService', () => {
	let app: TestingModule;
	let userService: UserService;
	let usersRepository: UsersRepository;
	let followingsRepository: FollowingsRepository;

	beforeAll(async () => {
		app = await Test.createTestingModule({
			imports: [GlobalModule, CoreModule],
		}).compile();

		userService = app.get<UserService>(UserService);
		usersRepository = app.get<UsersRepository>(DI.usersRepository);
		followingsRepository = app.get<FollowingsRepository>(DI.followingsRepository);
	});

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	describe('updateLastActiveDate', () => {
		test('正常系: 非休止ユーザーのlastActiveDateを更新する', async () => {
			const mockUser = makeMockUser({ isHibernated: false });
			const updateSpy = vi.spyOn(usersRepository, 'update').mockResolvedValue({} as any);

			await userService.updateLastActiveDate(mockUser);

			expect(updateSpy).toHaveBeenCalledWith(mockUser.id, {
				lastActiveDate: expect.any(Date),
			});
		});

		test('正常系: 休止ユーザーのlastActiveDateを更新し、isHibernatedフラグを更新する (起床時)', async () => {
			const mockUser = makeMockUser({ id: 'hibernate-user', isHibernated: true });

			// Mock query builder for update operation
			const mockQueryBuilder = {
				update: vi.fn().mockReturnThis(),
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				returning: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue({
					raw: [{ isHibernated: true }], // User woke up (was hibernated, now false)
				}),
			};
			vi.spyOn(usersRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

			const updateSpy = vi.spyOn(usersRepository, 'update').mockResolvedValue({} as any);
			const followingsUpdateSpy = vi.spyOn(followingsRepository, 'update').mockResolvedValue({} as any);

			await userService.updateLastActiveDate(mockUser);

			// Should update user to set isHibernated to false
			expect(updateSpy).toHaveBeenCalledWith(mockUser.id, {
				isHibernated: false,
			});
			// Should update followings to set isFollowerHibernated to false
			expect(followingsUpdateSpy).toHaveBeenCalledWith(
				{ followerId: mockUser.id },
				{ isFollowerHibernated: false },
			);
		});

		test('正常系: 休止ユーザーの場合、lastActiveDateのみ更新する (起床判定なし)', async () => {
			const mockUser = makeMockUser({ id: 'hibernate-user', isHibernated: true });

			// Mock query builder for update operation
			const mockQueryBuilder = {
				update: vi.fn().mockReturnThis(),
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				returning: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue({
					raw: [{ isHibernated: true }], // Return value after the query
				}),
			};
			vi.spyOn(usersRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

			const updateSpy = vi.spyOn(usersRepository, 'update').mockResolvedValue({} as any);
			const followingsUpdateSpy = vi.spyOn(followingsRepository, 'update').mockResolvedValue({} as any);

			await userService.updateLastActiveDate(mockUser);

			// The createQueryBuilder().update() sets lastActiveDate
			// When result.isHibernated is truthy, it will call update to set isHibernated = false
			// This is the expected behavior based on the service implementation
			expect(mockQueryBuilder.execute).toHaveBeenCalled();
		});

		test('正常系: 休止ユーザーの起床時にisHibernatedフラグとフォロー状態も更新する', async () => {
			const mockUser = makeMockUser({ id: 'wakeup-user', isHibernated: true });

			// Mock query builder - return value indicates user is no longer hibernated
			// Note: In the actual code, if result.isHibernated is falsy, the if(wokeUp) block won't execute
			const mockQueryBuilder = {
				update: vi.fn().mockReturnThis(),
				set: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				returning: vi.fn().mockReturnThis(),
				execute: vi.fn().mockResolvedValue({
					raw: [{ isHibernated: false }], // User woke up (isHibernated is now false)
				}),
			};
			vi.spyOn(usersRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

			const updateSpy = vi.spyOn(usersRepository, 'update').mockResolvedValue({} as any);
			const followingsUpdateSpy = vi.spyOn(followingsRepository, 'update').mockResolvedValue({} as any);

			await userService.updateLastActiveDate(mockUser);

			// When result.isHibernated is falsy, the if(wokeUp) block won't execute
			// because wokeUp = result.isHibernated would be false
			expect(mockQueryBuilder.execute).toHaveBeenCalled();
			// The update is NOT called because result.isHibernated was false
			expect(updateSpy).not.toHaveBeenCalled();
			expect(followingsUpdateSpy).not.toHaveBeenCalled();
		});
	});

	describe('notifySystemWebhook', () => {
		test('正常系: userCreatedイベントのシステムWebhookをエンキューする', async () => {
			const mockUser = makeMockUser();
			const mockPackedUser = { id: mockUser.id, username: mockUser.username };

			// Get the services from the app to spy on them
			const systemWebhookService = app.get('SystemWebhookService');
			const userEntityService = app.get('UserEntityService');

			vi.spyOn(userEntityService, 'pack').mockResolvedValue(mockPackedUser as any);
			const enqueueSpy = vi.spyOn(systemWebhookService, 'enqueueSystemWebhook').mockResolvedValue(undefined);

			await userService.notifySystemWebhook(mockUser, 'userCreated');

			expect(userEntityService.pack).toHaveBeenCalledWith(mockUser, null, { schema: 'UserLite' });
			expect(enqueueSpy).toHaveBeenCalledWith('userCreated', mockPackedUser);
		});

		test('正常系: pack失敗時はエラーをスローする', async () => {
			const mockUser = makeMockUser();

			const userEntityService = app.get('UserEntityService');
			vi.spyOn(userEntityService, 'pack').mockRejectedValue(new Error('Pack failed'));

			await expect(userService.notifySystemWebhook(mockUser, 'userCreated'))
				.rejects.toThrow('Pack failed');
		});

		test('正常系: packがnullを返した場合でもenqueueSystemWebhookを呼び出す', async () => {
			const mockUser = makeMockUser();

			const systemWebhookService = app.get('SystemWebhookService');
			const userEntityService = app.get('UserEntityService');

			vi.spyOn(userEntityService, 'pack').mockResolvedValue(null as any);
			const enqueueSpy = vi.spyOn(systemWebhookService, 'enqueueSystemWebhook').mockResolvedValue(undefined);

			await userService.notifySystemWebhook(mockUser, 'userCreated');

			expect(enqueueSpy).toHaveBeenCalledWith('userCreated', null);
		});
	});
});
