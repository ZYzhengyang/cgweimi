/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';

import { CoreModule } from '@/core/CoreModule.js';
import { ModerationLogService } from '@/core/ModerationLogService.js';
import { GlobalModule } from '@/GlobalModule.js';
import { DI } from '@/di-symbols.js';
import { IdService } from '@/core/IdService.js';
import type { ModerationLogsRepository } from '@/models/_.js';
import type { MiUser } from '@/models/User.js';

describe('ModerationLogService', () => {
	let app: TestingModule;
	let service: ModerationLogService;
	let moderationLogsRepository: ModerationLogsRepository;
	let idService: IdService;

	beforeAll(async () => {
		app = await Test.createTestingModule({
			imports: [GlobalModule, CoreModule],
		}).compile();
		service = app.get<ModerationLogService>(ModerationLogService);
		moderationLogsRepository = app.get<ModerationLogsRepository>(DI.moderationLogsRepository);
		idService = app.get<IdService>(IdService);
	});

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	describe('log', () => {
		test('正常系: モデレーターのログを記録 (info あり)', async () => {
			const insertSpy = vi.spyOn(moderationLogsRepository, 'insert').mockResolvedValue(undefined as any);
			const moderator: Pick<MiUser, 'id'> = { id: 'mod-1' };

			await service.log(moderator, 'suspend', { userId: 'u-target' });

			expect(insertSpy).toHaveBeenCalledTimes(1);
			const arg = insertSpy.mock.calls[0][0] as any;
			expect(arg.userId).toBe('mod-1');
			expect(arg.type).toBe('suspend');
			expect(arg.info).toEqual({ userId: 'u-target' });
			expect(typeof arg.id).toBe('string');
		});

		test('正常系: info 未指定時は空オブジェクトで insert', async () => {
			const insertSpy = vi.spyOn(moderationLogsRepository, 'insert').mockResolvedValue(undefined as any);
			const moderator: Pick<MiUser, 'id'> = { id: 'mod-1' };

			await service.log(moderator, 'resetPassword');

			const arg = insertSpy.mock.calls[0][0] as any;
			expect(arg.info).toEqual({});
			expect(arg.type).toBe('resetPassword');
		});

		test('正常系: ID は IdService.gen() 由来 (aidx)', async () => {
			const insertSpy = vi.spyOn(moderationLogsRepository, 'insert').mockResolvedValue(undefined as any);
			const moderator: Pick<MiUser, 'id'> = { id: 'mod-1' };

			const expectedId = idService.gen();
			await service.log(moderator, 'suspend', { userId: 'x' });

			const arg = insertSpy.mock.calls[0][0] as any;
			expect(arg.id).toBeDefined();
			expect(typeof arg.id).toBe('string');
			// 別途生成した ID と同じ長さ・パターン (aidx の正規表現にマッチ)
			expect(arg.id).toMatch(/^[0-9a-z]{16}$/);
			expect(arg.id.length).toBe(expectedId.length);
		});

		test('異常系: repository が throw したら伝播する', async () => {
			vi.spyOn(moderationLogsRepository, 'insert').mockRejectedValue(new Error('db down'));
			const moderator: Pick<MiUser, 'id'> = { id: 'mod-1' };

			await expect(service.log(moderator, 'suspend')).rejects.toThrow('db down');
		});

		test('正常系: 異なる type パラメータで複数回呼んでもエラーなし', async () => {
			const insertSpy = vi.spyOn(moderationLogsRepository, 'insert').mockResolvedValue(undefined as any);
			const moderator: Pick<MiUser, 'id'> = { id: 'mod-1' };

			await service.log(moderator, 'suspend', { userId: 'a' });
			await service.log(moderator, 'unsuspend', { userId: 'a' });
			await service.log(moderator, 'deleteNote', { noteId: 'n' });
			await service.log(moderator, 'deleteUser', { userId: 'b' });

			expect(insertSpy).toHaveBeenCalledTimes(4);
			const types = insertSpy.mock.calls.map(c => (c[0] as any).type);
			expect(types).toEqual(['suspend', 'unsuspend', 'deleteNote', 'deleteUser']);
		});
	});
});
