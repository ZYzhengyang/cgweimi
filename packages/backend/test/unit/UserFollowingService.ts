/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';

import { CoreModule } from '@/core/CoreModule.js';
import { GlobalModule } from '@/GlobalModule.js';
import { UserFollowingService } from '@/core/UserFollowingService.js';
import { DI } from '@/di-symbols.js';
import type { FollowingsRepository } from '@/models/_.js';

describe('UserFollowingService', () => {
	let app: TestingModule;
	let userFollowingService: UserFollowingService;
	let followingsRepository: FollowingsRepository;

	beforeAll(async () => {
		app = await Test.createTestingModule({
			imports: [GlobalModule, CoreModule],
		}).compile();
		userFollowingService = app.get<UserFollowingService>(UserFollowingService);
		followingsRepository = app.get<FollowingsRepository>(DI.followingsRepository);
	});

	describe('isFollowing', () => {
		test('フォロー関係が存在する場合 true を返す', async () => {
			vi.spyOn(followingsRepository, 'exists').mockResolvedValue(true);

			const result = await userFollowingService.isFollowing('follower-1', 'followee-1');
			expect(result).toBe(true);
			expect(followingsRepository.exists).toHaveBeenCalledWith({
				where: {
					followerId: 'follower-1',
					followeeId: 'followee-1',
				},
			});
		});

		test('フォロー関係が存在しない場合 false を返す', async () => {
			vi.spyOn(followingsRepository, 'exists').mockResolvedValue(false);

			const result = await userFollowingService.isFollowing('follower-1', 'followee-1');
			expect(result).toBe(false);
		});
	});

	describe('isMutual', () => {
		function makeQueryBuilderMock(countValue: number) {
			const qb: any = {
				where: vi.fn().mockReturnThis(),
				orWhere: vi.fn().mockReturnThis(),
				getCount: vi.fn().mockResolvedValue(countValue),
			};
			vi.spyOn(followingsRepository, 'createQueryBuilder').mockReturnValue(qb);
			return qb;
		}

		beforeEach(() => {
			vi.restoreAllMocks();
		});

		test('相互フォロー (count=2) → true', async () => {
			makeQueryBuilderMock(2);

			const result = await userFollowingService.isMutual('a', 'b');
			expect(result).toBe(true);
		});

		test('片方向フォロー (count=1) → false', async () => {
			makeQueryBuilderMock(1);

			const result = await userFollowingService.isMutual('a', 'b');
			expect(result).toBe(false);
		});

		test('フォロー関係なし (count=0) → false', async () => {
			makeQueryBuilderMock(0);

			const result = await userFollowingService.isMutual('a', 'b');
			expect(result).toBe(false);
		});
	});

	describe('getFollowees', () => {
		test('クエリビルダーを呼び出して結果を返す', async () => {
			const expected = [{ followeeId: 'f1' }, { followeeId: 'f2' }];
			const qb: any = {
				select: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				getMany: vi.fn().mockResolvedValue(expected),
			};
			vi.spyOn(followingsRepository, 'createQueryBuilder').mockReturnValue(qb);

			const result = await userFollowingService.getFollowees('user-1');
			expect(result).toEqual(expected);
			expect(qb.select).toHaveBeenCalledWith('following.followeeId');
			expect(qb.where).toHaveBeenCalledWith('following.followerId = :followerId', { followerId: 'user-1' });
		});
	});
});
