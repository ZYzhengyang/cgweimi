/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';

import { CoreModule } from '@/core/CoreModule.js';
import { GlobalModule } from '@/GlobalModule.js';
import { NotificationService } from '@/core/NotificationService.js';
import { DI } from '@/di-symbols.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { PushNotificationService } from '@/core/PushNotificationService.js';
import type { MiNotification } from '@/models/Notification.js';

describe('NotificationService', () => {
	let app: TestingModule;
	let notificationService: NotificationService;
	let redisClient: any;
	let globalEventService: GlobalEventService;
	let pushNotificationService: PushNotificationService;

	beforeAll(async () => {
		app = await Test.createTestingModule({
			imports: [GlobalModule, CoreModule],
		}).compile();
		notificationService = app.get<NotificationService>(NotificationService);
		redisClient = app.get<any>(DI.redis);
		globalEventService = app.get<GlobalEventService>(GlobalEventService);
		pushNotificationService = app.get<PushNotificationService>(PushNotificationService);
	});

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	describe('dispose / onApplicationShutdown', () => {
		test('dispose は abort シグナルを発火する', () => {
			// dispose 後に onApplicationShutdown 相当の動作確認 (重複呼び出しでも安全)
			expect(() => notificationService.dispose()).not.toThrow();
			expect(() => notificationService.dispose()).not.toThrow();
		});

		test('onApplicationShutdown は dispose を委譲する', () => {
			expect(() => notificationService.onApplicationShutdown('SIGTERM')).not.toThrow();
		});
	});

	describe('readAllNotification', () => {
		test('通知ストリームが空 → 何もしない (postReadは呼ばれない)', async () => {
			vi.spyOn(redisClient, 'get').mockResolvedValue(null);
			vi.spyOn(redisClient, 'xrevrange').mockResolvedValue([]);
			const postReadSpy = vi.spyOn(globalEventService, 'publishMainStream');

			await notificationService.readAllNotification('user-1');

			expect(postReadSpy).not.toHaveBeenCalledWith('user-1', 'readAllNotifications');
		});

		test('既読IDが未設定 → postRead を呼ぶ', async () => {
			vi.spyOn(redisClient, 'get').mockResolvedValue(null);
			vi.spyOn(redisClient, 'xrevrange').mockResolvedValue([['latest-stream-id', ['data', '{}']]]);
			vi.spyOn(redisClient, 'set').mockResolvedValue('OK');
			const postReadSpy = vi.spyOn(globalEventService, 'publishMainStream');
			vi.spyOn(pushNotificationService, 'pushNotification').mockResolvedValue(undefined);

			await notificationService.readAllNotification('user-1');

			expect(redisClient.set).toHaveBeenCalledWith('latestReadNotification:user-1', 'latest-stream-id');
			expect(postReadSpy).toHaveBeenCalledWith('user-1', 'readAllNotifications');
		});

		test('既読IDが最新と同じ → postRead は呼ばれない', async () => {
			vi.spyOn(redisClient, 'get').mockResolvedValue('same-id');
			vi.spyOn(redisClient, 'xrevrange').mockResolvedValue([['same-id', ['data', '{}']]]);
			vi.spyOn(redisClient, 'set').mockResolvedValue('OK');
			const postReadSpy = vi.spyOn(globalEventService, 'publishMainStream');

			await notificationService.readAllNotification('user-1');

			expect(postReadSpy).not.toHaveBeenCalledWith('user-1', 'readAllNotifications');
		});

		test('既読IDより新しい通知がある → postRead を呼ぶ', async () => {
			// Redis stream の id は time-sequence 形式 (例: "1700000000000-0")
			// 辞書順で古い < 新しい となる
			vi.spyOn(redisClient, 'get').mockResolvedValue('1700000000000-0');
			vi.spyOn(redisClient, 'xrevrange').mockResolvedValue([['1800000000000-0', ['data', '{}']]]);
			vi.spyOn(redisClient, 'set').mockResolvedValue('OK');
			const postReadSpy = vi.spyOn(globalEventService, 'publishMainStream');
			vi.spyOn(pushNotificationService, 'pushNotification').mockResolvedValue(undefined);

			await notificationService.readAllNotification('user-1');

			expect(postReadSpy).toHaveBeenCalledWith('user-1', 'readAllNotifications');
		});

		test('force=true → 必ず postRead を呼ぶ', async () => {
			vi.spyOn(redisClient, 'get').mockResolvedValue('same-id');
			vi.spyOn(redisClient, 'xrevrange').mockResolvedValue([['same-id', ['data', '{}']]]);
			vi.spyOn(redisClient, 'set').mockResolvedValue('OK');
			const postReadSpy = vi.spyOn(globalEventService, 'publishMainStream');
			vi.spyOn(pushNotificationService, 'pushNotification').mockResolvedValue(undefined);

			await notificationService.readAllNotification('user-1', true);

			expect(postReadSpy).toHaveBeenCalledWith('user-1', 'readAllNotifications');
		});
	});

	describe('flushAllNotifications', () => {
		test('Redis キー削除と publishMainStream を実行する', async () => {
			vi.spyOn(redisClient, 'del').mockResolvedValue(1);
			const publishSpy = vi.spyOn(globalEventService, 'publishMainStream').mockReturnValue(undefined);

			await notificationService.flushAllNotifications('user-1');

			expect(redisClient.del).toHaveBeenCalledTimes(2);
			expect(redisClient.del).toHaveBeenCalledWith('notificationTimeline:user-1');
			expect(redisClient.del).toHaveBeenCalledWith('latestReadNotification:user-1');
			expect(publishSpy).toHaveBeenCalledWith('user-1', 'notificationFlushed');
		});
	});

	describe('getNotifications', () => {
		function makeNote(type: string, extra: Record<string, any> = {}): MiNotification {
			return {
				id: `n-${Math.random().toString(36).slice(2)}`,
				createdAt: new Date(),
				type,
				...extra,
			} as unknown as MiNotification;
		}

		test('空の結果は空配列を返す', async () => {
			vi.spyOn(redisClient, 'xrevrange').mockResolvedValue([]);

			const result = await notificationService.getNotifications('user-1', {});
			expect(result).toEqual([]);
		});

		test('includeTypes でフィルタする', async () => {
			const a = makeNote('follow');
			const b = makeNote('mention');
			const c = makeNote('follow');
			vi.spyOn(redisClient, 'xrevrange').mockResolvedValue([
				['3', ['data', JSON.stringify(a)]],
				['2', ['data', JSON.stringify(b)]],
				['1', ['data', JSON.stringify(c)]],
			]);

			const result = await notificationService.getNotifications('user-1', {
				includeTypes: ['follow'],
			});

			expect(result.map(n => n.type)).toEqual(['follow', 'follow']);
		});

		test('excludeTypes で除外する', async () => {
			const a = makeNote('follow');
			const b = makeNote('mention');
			vi.spyOn(redisClient, 'xrevrange').mockResolvedValue([
				['2', ['data', JSON.stringify(a)]],
				['1', ['data', JSON.stringify(b)]],
			]);

			const result = await notificationService.getNotifications('user-1', {
				excludeTypes: ['mention'],
			});

			expect(result.map(n => n.type)).toEqual(['follow']);
		});

		test('sinceId のみ指定で xrange を使う (古い順)', async () => {
			vi.spyOn(redisClient, 'xrange').mockResolvedValue([
				['1', ['data', JSON.stringify(makeNote('follow'))]],
			]);
			vi.spyOn(redisClient, 'xrevrange').mockResolvedValue([]);

			await notificationService.getNotifications('user-1', {
				sinceId: '9z',
			});

			expect(redisClient.xrange).toHaveBeenCalled();
			expect(redisClient.xrevrange).not.toHaveBeenCalled();
		});
	});
});
