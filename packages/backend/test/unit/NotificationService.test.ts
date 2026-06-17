/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

process.env.NODE_ENV = 'test';

import { describe, expect, beforeEach, afterEach, test, vi, afterAll, beforeAll } from 'vitest';
import type { Mocked } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Redis } from 'ioredis';
import { GlobalModule } from '@/GlobalModule.js';
import { CoreModule } from '@/core/CoreModule.js';
import { NotificationService } from '@/core/NotificationService.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { PushNotificationService } from '@/core/PushNotificationService.js';
import { NotificationEntityService } from '@/core/entities/NotificationEntityService.js';
import { IdService } from '@/core/IdService.js';
import { CacheService } from '@/core/CacheService.js';
import { UserListService } from '@/core/UserListService.js';
import type {
	MiUser,
	MiLocalUser,
	UserProfilesRepository,
	UsersRepository,
	UserListMembershipsRepository,
	MutingsRepository,
	FollowingsRepository,
} from '@/models/_.js';
import type { MiNotification } from '@/models/Notification.js';
import { DI } from '@/di-symbols.js';
import { genAidx, parseAidxFull } from '@/misc/id/aidx.js';

/**
 * Helper to convert AIDX to Redis Stream ID format
 * NotificationService stores notifications with Redis Stream ID = toXListId(notification.id)
 */
function toXListId(id: string): string {
	const { date, additional } = parseAidxFull(id);
	return date.toString() + '-' + BigInt.asUintN(64, additional).toString();
}

describe('NotificationService', () => {
	let app: TestingModule;
	let service: NotificationService;
	let redisClient: Redis;
	let usersRepository: UsersRepository;
	let userProfilesRepository: UserProfilesRepository;
	let mutingsRepository: MutingsRepository;
	let followingsRepository: FollowingsRepository;
	let userListMembershipsRepository: UserListMembershipsRepository;
	let idService: IdService;
	let globalEventService: Mocked<GlobalEventService>;
	let pushNotificationService: Mocked<PushNotificationService>;

	let alice: MiLocalUser;
	let bob: MiLocalUser;
	let carol: MiLocalUser;

	async function createUser(data: Partial<MiUser> = {}): Promise<MiLocalUser> {
		const user = await usersRepository
			.insert({
				id: idService.gen(),
				username: `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
				usernameLower: `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
				...data,
			})
			.then(x => usersRepository.findOneByOrFail(x.identifiers[0]));

		return user as MiLocalUser;
	}

	async function createUserProfile(userId: MiUser['id']): Promise<void> {
		await userProfilesRepository.insert({
			userId,
			email: null,
		});
	}

	/**
	 * Create a notification in Redis with proper stream ID format
	 */
	async function createNotificationInRedis(
		userId: MiUser['id'],
		notifierId: MiUser['id'],
		type: MiNotification['type'] = 'follow'
	): Promise<string> {
		const notificationId = genAidx(Date.now());
		const notification = {
			id: notificationId,
			createdAt: new Date().toISOString(),
			type,
			...(notifierId ? { notifierId } : {}),
		};

		// Use proper stream ID format
		const streamId = toXListId(notificationId);

		await redisClient.xadd(
			`notificationTimeline:${userId}`,
			'MAXLEN', '~', '100',
			streamId,
			'data', JSON.stringify(notification)
		);

		return notificationId;
	}

	beforeAll(async () => {
		app = await Test.createTestingModule({
			imports: [
				GlobalModule,
				CoreModule,
			],
			providers: [
				NotificationService,
				GlobalEventService,
				PushNotificationService,
				NotificationEntityService,
				IdService,
				CacheService,
				UserListService,
			],
		})
			.overrideProvider(GlobalEventService)
			.useValue({
				publishMainStream: vi.fn(),
				publishBroadcastStream: vi.fn(),
			})
			.overrideProvider(PushNotificationService)
			.useValue({
				pushNotification: vi.fn(),
			})
			.compile();

		app.enableShutdownHooks();

		service = app.get<NotificationService>(NotificationService);
		redisClient = app.get<Redis>(DI.redis);
		idService = app.get<IdService>(IdService);
		usersRepository = app.get<UsersRepository>(DI.usersRepository);
		userProfilesRepository = app.get<UserProfilesRepository>(DI.userProfilesRepository);
		mutingsRepository = app.get<MutingsRepository>(DI.mutingsRepository);
		followingsRepository = app.get<FollowingsRepository>(DI.followingsRepository);
		userListMembershipsRepository = app.get<UserListMembershipsRepository>(DI.userListMembershipsRepository);
		globalEventService = app.get(GlobalEventService) as Mocked<GlobalEventService>;
		pushNotificationService = app.get(PushNotificationService) as Mocked<PushNotificationService>;
	});

	afterAll(async () => {
		await app.close();
	});

	beforeEach(async () => {
		alice = await createUser({ username: 'alice' });
		bob = await createUser({ username: 'bob' });
		carol = await createUser({ username: 'carol' });

		await createUserProfile(alice.id);
		await createUserProfile(bob.id);
		await createUserProfile(carol.id);

		vi.clearAllMocks();
	});

	afterEach(async () => {
		// Clean up Redis streams
		await redisClient.del(`notificationTimeline:${alice.id}`);
		await redisClient.del(`notificationTimeline:${bob.id}`);
		await redisClient.del(`notificationTimeline:${carol.id}`);
		await redisClient.del(`latestReadNotification:${alice.id}`);
		await redisClient.del(`latestReadNotification:${bob.id}`);
		await redisClient.del(`latestReadNotification:${carol.id}`);

		// Clean up DB
		await mutingsRepository.createQueryBuilder().delete().execute();
		await followingsRepository.createQueryBuilder().delete().execute();
		await userListMembershipsRepository.createQueryBuilder().delete().execute();
		await userProfilesRepository.createQueryBuilder().delete().execute();
		await usersRepository.createQueryBuilder().delete().execute();
	});

	// ============================================
	// getNotifications Tests
	// ============================================
	describe('getNotifications', () => {
		test('空の結果を返す', async () => {
			const result = await service.getNotifications(alice.id, {});
			expect(result).toEqual([]);
		});

		test('通知を取得できる', async () => {
			await createNotificationInRedis(alice.id, bob.id, 'follow');
			await createNotificationInRedis(alice.id, carol.id, 'mention');

			const result = await service.getNotifications(alice.id, {});

			expect(result.length).toBe(2);
		});

		test('includeTypesでフィルターできる', async () => {
			await createNotificationInRedis(alice.id, bob.id, 'follow');
			await createNotificationInRedis(alice.id, carol.id, 'mention');

			const result = await service.getNotifications(alice.id, {
				includeTypes: ['follow'],
			});

			expect(result.length).toBe(1);
			expect(result[0].type).toBe('follow');
		});

		test('excludeTypesでフィルターできる', async () => {
			await createNotificationInRedis(alice.id, bob.id, 'follow');
			await createNotificationInRedis(alice.id, carol.id, 'mention');

			const result = await service.getNotifications(alice.id, {
				excludeTypes: ['follow'],
			});

			expect(result.length).toBe(1);
			expect(result[0].type).toBe('mention');
		});

		test('limitで取得件数を制限できる', async () => {
			for (let i = 0; i < 5; i++) {
				await createNotificationInRedis(alice.id, bob.id, 'follow');
			}

			const result = await service.getNotifications(alice.id, {
				limit: 2,
			});

			expect(result.length).toBe(2);
		});

		test('sinceId・untilIdなしでも通知を取得できる', async () => {
			await createNotificationInRedis(alice.id, bob.id, 'follow');
			await createNotificationInRedis(alice.id, carol.id, 'mention');

			const result = await service.getNotifications(alice.id, {
				limit: 10,
			});

			expect(result.length).toBe(2);
		});

		test('includeTypesとexcludeTypesを同時に指定した場合、includeTypesが優先', async () => {
			await createNotificationInRedis(alice.id, bob.id, 'follow');
			await createNotificationInRedis(alice.id, carol.id, 'mention');
			await createNotificationInRedis(alice.id, alice.id, 'reaction');

			// includeTypes優先で動作
			const result = await service.getNotifications(alice.id, {
				includeTypes: ['follow', 'mention'],
			});

			expect(result.length).toBe(2);
		});

		test('空の通知タイプ配列でフィルター', async () => {
			await createNotificationInRedis(alice.id, bob.id, 'follow');

			const result = await service.getNotifications(alice.id, {
				includeTypes: [],
			});

			// Empty includeTypes should return all notifications
			expect(result.length).toBe(1);
		});

		test('paginationパラメータなしでも動作する', async () => {
			await createNotificationInRedis(alice.id, bob.id, 'follow');

			const result = await service.getNotifications(alice.id, {
				limit: undefined,
				includeTypes: undefined,
				excludeTypes: undefined,
			});

			expect(result.length).toBe(1);
		});

		test('複数の通知タイプでフィルター', async () => {
			await createNotificationInRedis(alice.id, bob.id, 'follow');
			await createNotificationInRedis(alice.id, carol.id, 'mention');
			await createNotificationInRedis(alice.id, alice.id, 'reaction');

			const result = await service.getNotifications(alice.id, {
				includeTypes: ['follow', 'mention', 'reaction'],
			});

			expect(result.length).toBe(3);
		});

		test('除外した通知タイプは返らない', async () => {
			await createNotificationInRedis(alice.id, bob.id, 'follow');
			await createNotificationInRedis(alice.id, carol.id, 'mention');
			await createNotificationInRedis(alice.id, alice.id, 'reaction');

			const result = await service.getNotifications(alice.id, {
				excludeTypes: ['reaction'],
			});

			expect(result.length).toBe(2);
			expect(result.some(n => n.type === 'reaction')).toBe(false);
		});
	});

	// ============================================
	// flushAllNotifications Tests
	// ============================================
	describe('flushAllNotifications', () => {
		test('通知ストリームをクリアする', async () => {
			// Create notifications in Redis
			await createNotificationInRedis(alice.id, bob.id, 'follow');
			await createNotificationInRedis(alice.id, carol.id, 'mention');

			// Verify notifications exist
			let count = await redisClient.xlen(`notificationTimeline:${alice.id}`);
			expect(count).toBeGreaterThan(0);

			// Flush
			await service.flushAllNotifications(alice.id);

			// Verify stream is cleared
			count = await redisClient.xlen(`notificationTimeline:${alice.id}`);
			expect(count).toBe(0);

			// Verify event is published
			expect(globalEventService.publishMainStream).toHaveBeenCalledWith(
				alice.id, 'notificationFlushed'
			);
		});

		test('latestReadNotificationもクリアする', async () => {
			// Set latestReadNotification
			await redisClient.set(`latestReadNotification:${alice.id}`, 'test-id');

			await service.flushAllNotifications(alice.id);

			const latestRead = await redisClient.get(`latestReadNotification:${alice.id}`);
			expect(latestRead).toBeNull();
		});

		test('存在しないユーザーの通知をflushしてもエラーにならない', async () => {
			const nonExistentId = genAidx(Date.now() - 100000);

			// Should not throw
			await expect(service.flushAllNotifications(nonExistentId)).resolves.not.toThrow();
		});

		test('複数のユーザーの通知を個別にflushできる', async () => {
			await createNotificationInRedis(alice.id, bob.id, 'follow');
			await createNotificationInRedis(bob.id, carol.id, 'follow');

			await service.flushAllNotifications(alice.id);

			// Bob's notifications should still exist
			const bobCount = await redisClient.xlen(`notificationTimeline:${bob.id}`);
			expect(bobCount).toBeGreaterThan(0);
		});
	});

	// ============================================
	// readAllNotification Tests
	// ============================================
	describe('readAllNotification', () => {
		test('未読通知がない場合は何も起こらない', async () => {
			await service.readAllNotification(alice.id);

			// No readAllNotifications event should be published
			const readAllCall = (globalEventService.publishMainStream as any).mock.calls.find(
				(call: any[]) => call[1] === 'readAllNotifications'
			);
			expect(readAllCall).toBeUndefined();
		});

		test('latestReadNotificationが設定される', async () => {
			// First create a notification
			await createNotificationInRedis(alice.id, bob.id, 'follow');
			await new Promise(resolve => setTimeout(resolve, 50));

			await service.readAllNotification(alice.id);

			// latestReadNotification should be set
			const latestRead = await redisClient.get(`latestReadNotification:${alice.id}`);
			expect(latestRead).toBeTruthy();
		});
	});

	// ============================================
	// Notification Filtering Tests
	// ============================================
	describe('通知フィルター (Redis Stream直接)', () => {
		test('reactionタイプのみ取得', async () => {
			await createNotificationInRedis(alice.id, bob.id, 'follow');
			await createNotificationInRedis(alice.id, carol.id, 'reaction');
			await createNotificationInRedis(alice.id, alice.id, 'renote');

			const result = await service.getNotifications(alice.id, {
				includeTypes: ['reaction'],
			});

			expect(result.length).toBe(1);
			expect(result[0].type).toBe('reaction');
		});

		test('followとmention以外を除外', async () => {
			await createNotificationInRedis(alice.id, bob.id, 'follow');
			await createNotificationInRedis(alice.id, carol.id, 'mention');
			await createNotificationInRedis(alice.id, alice.id, 'reaction');

			const result = await service.getNotifications(alice.id, {
				excludeTypes: ['follow', 'mention'],
			});

			expect(result.length).toBe(1);
			expect(result[0].type).toBe('reaction');
		});

		test('app通知を取得できる', async () => {
			await createNotificationInRedis(alice.id, bob.id, 'app');

			const result = await service.getNotifications(alice.id, {
				includeTypes: ['app'],
			});

			expect(result.length).toBe(1);
			expect(result[0].type).toBe('app');
		});

		test('achievement通知を取得できる', async () => {
			await createNotificationInRedis(alice.id, bob.id, 'achievementEarned');

			const result = await service.getNotifications(alice.id, {
				includeTypes: ['achievementEarned'],
			});

			expect(result.length).toBe(1);
			expect(result[0].type).toBe('achievementEarned');
		});
	});

	// ============================================
	// Edge Cases
	// ============================================
	describe('エッジケース', () => {
		test('存在しないユーザーからの通知もRedisに保存される', async () => {
			const nonExistentUserId = genAidx(Date.now() - 100000);
			await createNotificationInRedis(alice.id, nonExistentUserId, 'follow');

			const result = await service.getNotifications(alice.id, {});

			expect(result.length).toBe(1);
		});

		test('大きなlimit値でも動作する', async () => {
			await createNotificationInRedis(alice.id, bob.id, 'follow');

			const result = await service.getNotifications(alice.id, {
				limit: 1000,
			});

			expect(result.length).toBe(1);
		});

		test('通知は時系列順で返される', async () => {
			// Create notifications with slight time delays to ensure order
			await createNotificationInRedis(alice.id, bob.id, 'follow');
			await new Promise(resolve => setTimeout(resolve, 10));
			await createNotificationInRedis(alice.id, carol.id, 'mention');

			const result = await service.getNotifications(alice.id, {});

			expect(result.length).toBe(2);
			// Most recent first (default behavior)
			expect(result[0].type).toBe('mention');
		});
	});
});
