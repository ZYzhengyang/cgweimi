/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { beforeAll, describe, expect, test, vi } from 'vitest';
import { Test } from '@nestjs/testing';

import { CoreModule } from '@/core/CoreModule.js';
import { ChatService } from '@/core/ChatService.js';
import { GlobalModule } from '@/GlobalModule.js';
import { RoleService } from '@/core/RoleService.js';

describe('ChatService', () => {
	let chatService: ChatService;
	let roleService: RoleService;

	beforeAll(async () => {
		const app = await Test.createTestingModule({
			imports: [GlobalModule, CoreModule],
		}).compile();
		chatService = app.get<ChatService>(ChatService);
		roleService = app.get<RoleService>(RoleService);
	});

	describe('getChatAvailability', () => {
		test('available → {read: true, write: true}', async () => {
			vi.spyOn(roleService, 'getUserPolicies').mockResolvedValue({
				chatAvailability: 'available',
			} as any);

			const result = await chatService.getChatAvailability('user-1');
			expect(result).toEqual({ read: true, write: true });
		});

		test('readonly → {read: true, write: false}', async () => {
			vi.spyOn(roleService, 'getUserPolicies').mockResolvedValue({
				chatAvailability: 'readonly',
			} as any);

			const result = await chatService.getChatAvailability('user-1');
			expect(result).toEqual({ read: true, write: false });
		});

		test('unavailable → {read: false, write: false}', async () => {
			vi.spyOn(roleService, 'getUserPolicies').mockResolvedValue({
				chatAvailability: 'unavailable',
			} as any);

			const result = await chatService.getChatAvailability('user-1');
			expect(result).toEqual({ read: false, write: false });
		});

		test('未知の値 → エラー', async () => {
			vi.spyOn(roleService, 'getUserPolicies').mockResolvedValue({
				chatAvailability: 'something-invalid',
			} as any);

			await expect(chatService.getChatAvailability('user-1')).rejects.toThrow('invalid chat availability (unreachable)');
		});
	});

	describe('checkChatAvailability', () => {
		test('available で read チェック → 通過', async () => {
			vi.spyOn(roleService, 'getUserPolicies').mockResolvedValue({
				chatAvailability: 'available',
			} as any);

			await expect(chatService.checkChatAvailability('user-1', 'read')).resolves.toBeUndefined();
		});

		test('available で write チェック → 通過', async () => {
			vi.spyOn(roleService, 'getUserPolicies').mockResolvedValue({
				chatAvailability: 'available',
			} as any);

			await expect(chatService.checkChatAvailability('user-1', 'write')).resolves.toBeUndefined();
		});

		test('readonly で read チェック → 通過', async () => {
			vi.spyOn(roleService, 'getUserPolicies').mockResolvedValue({
				chatAvailability: 'readonly',
			} as any);

			await expect(chatService.checkChatAvailability('user-1', 'read')).resolves.toBeUndefined();
		});

		test('readonly で write チェック → 拒否', async () => {
			vi.spyOn(roleService, 'getUserPolicies').mockResolvedValue({
				chatAvailability: 'readonly',
			} as any);

			await expect(chatService.checkChatAvailability('user-1', 'write')).rejects.toThrow('ROLE_PERMISSION_DENIED');
		});

		test('unavailable で read チェック → 拒否', async () => {
			vi.spyOn(roleService, 'getUserPolicies').mockResolvedValue({
				chatAvailability: 'unavailable',
			} as any);

			await expect(chatService.checkChatAvailability('user-1', 'read')).rejects.toThrow('ROLE_PERMISSION_DENIED');
		});

		test('unavailable で write チェック → 拒否', async () => {
			vi.spyOn(roleService, 'getUserPolicies').mockResolvedValue({
				chatAvailability: 'unavailable',
			} as any);

			await expect(chatService.checkChatAvailability('user-1', 'write')).rejects.toThrow('ROLE_PERMISSION_DENIED');
		});
	});
});
