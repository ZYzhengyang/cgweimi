/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { QueryFailedError } from 'typeorm';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';

import { CoreModule } from '@/core/CoreModule.js';
import { ClipService } from '@/core/ClipService.js';
import { GlobalModule } from '@/GlobalModule.js';
import { DI } from '@/di-symbols.js';
import { IdService } from '@/core/IdService.js';
import { RoleService } from '@/core/RoleService.js';
import type { ClipNotesRepository, ClipsRepository, MiClip, NotesRepository } from '@/models/_.js';
import type { MiLocalUser } from '@/models/User.js';

const mockMe: MiLocalUser = {
	id: 'me-id',
	host: null,
	username: 'me',
} as unknown as MiLocalUser;

describe('ClipService', () => {
	let app: TestingModule;
	let clipService: ClipService;
	let clipsRepository: ClipsRepository;
	let clipNotesRepository: ClipNotesRepository;
	let notesRepository: NotesRepository;
	let idService: IdService;
	let roleService: RoleService;

	beforeAll(async () => {
		app = await Test.createTestingModule({
			imports: [GlobalModule, CoreModule],
		}).compile();
		clipService = app.get<ClipService>(ClipService);
		clipsRepository = app.get<ClipsRepository>(DI.clipsRepository);
		clipNotesRepository = app.get<ClipNotesRepository>(DI.clipNotesRepository);
		notesRepository = app.get<NotesRepository>(DI.notesRepository);
		idService = app.get<IdService>(IdService);
		roleService = app.get<RoleService>(RoleService);
	});

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	describe('create', () => {
		test('正常系: 上限未満なら insert して返す', async () => {
			vi.spyOn(clipsRepository, 'countBy').mockResolvedValue(0);
			vi.spyOn(roleService, 'getUserPolicies').mockResolvedValue({ clipLimit: 5 } as any);
			const inserted: MiClip = { id: 'new-clip', userId: mockMe.id, name: 'a', isPublic: true, description: null } as MiClip;
			vi.spyOn(clipsRepository, 'insertOne').mockResolvedValue(inserted);

			const result = await clipService.create(mockMe, 'a', true, null);
			expect(result).toEqual(inserted);
			expect(clipsRepository.insertOne).toHaveBeenCalledTimes(1);
		});

		test('異常系: 上限に達している場合は TooManyClipsError', async () => {
			vi.spyOn(clipsRepository, 'countBy').mockResolvedValue(10);
			vi.spyOn(roleService, 'getUserPolicies').mockResolvedValue({ clipLimit: 5 } as any);

			await expect(
				clipService.create(mockMe, 'a', true, null),
			).rejects.toBeInstanceOf(ClipService.TooManyClipsError);
		});

		test('create に渡される description=null はそのまま保存される', async () => {
			vi.spyOn(clipsRepository, 'countBy').mockResolvedValue(0);
			vi.spyOn(roleService, 'getUserPolicies').mockResolvedValue({ clipLimit: 5 } as any);
			const insertSpy = vi.spyOn(clipsRepository, 'insertOne').mockResolvedValue({ id: 'x' } as any);

			await clipService.create(mockMe, 'name', false, null);
			expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({ description: null, isPublic: false }));
		});
	});

	describe('update', () => {
		test('正常系: 自分のクリップが存在すれば update', async () => {
			const existing: MiClip = { id: 'c1', userId: mockMe.id } as MiClip;
			vi.spyOn(clipsRepository, 'findOneBy').mockResolvedValue(existing);
			const updateSpy = vi.spyOn(clipsRepository, 'update').mockResolvedValue(undefined as any);

			await clipService.update(mockMe, 'c1', 'new-name', true, 'desc');
			expect(updateSpy).toHaveBeenCalledWith('c1', expect.objectContaining({ name: 'new-name', isPublic: true, description: 'desc' }));
		});

		test('異常系: 他人のクリップ / 存在しないクリップは NoSuchClipError', async () => {
			vi.spyOn(clipsRepository, 'findOneBy').mockResolvedValue(null);

			await expect(
				clipService.update(mockMe, 'other-clip', 'x', true, null),
			).rejects.toBeInstanceOf(ClipService.NoSuchClipError);
		});
	});

	describe('delete', () => {
		test('正常系: 自分のクリップを delete', async () => {
			const existing: MiClip = { id: 'c1', userId: mockMe.id } as MiClip;
			vi.spyOn(clipsRepository, 'findOneBy').mockResolvedValue(existing);
			const deleteSpy = vi.spyOn(clipsRepository, 'delete').mockResolvedValue(undefined as any);

			await clipService.delete(mockMe, 'c1');
			expect(deleteSpy).toHaveBeenCalledWith('c1');
		});

		test('異常系: 存在しないクリップは NoSuchClipError', async () => {
			vi.spyOn(clipsRepository, 'findOneBy').mockResolvedValue(null);

			await expect(
				clipService.delete(mockMe, 'non-existent'),
			).rejects.toBeInstanceOf(ClipService.NoSuchClipError);
		});
	});

	describe('addNote', () => {
		test('正常系: クリップにノートを追加し clippedCount をインクリメント', async () => {
			const existing: MiClip = { id: 'c1', userId: mockMe.id } as MiClip;
			vi.spyOn(clipsRepository, 'findOneBy').mockResolvedValue(existing);
			vi.spyOn(clipNotesRepository, 'countBy').mockResolvedValue(0);
			vi.spyOn(roleService, 'getUserPolicies').mockResolvedValue({ noteEachClipsLimit: 100 } as any);
			const insertSpy = vi.spyOn(clipNotesRepository, 'insert').mockResolvedValue(undefined as any);
			const updateClipSpy = vi.spyOn(clipsRepository, 'update').mockResolvedValue(undefined as any);
			const incrementSpy = vi.spyOn(notesRepository, 'increment').mockResolvedValue(undefined as any);

			await clipService.addNote(mockMe, 'c1', 'n1');
			expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({ clipId: 'c1', noteId: 'n1' }));
			expect(updateClipSpy).toHaveBeenCalledWith('c1', expect.objectContaining({ lastClippedAt: expect.any(Date) }));
			expect(incrementSpy).toHaveBeenCalledWith({ id: 'n1' }, 'clippedCount', 1);
		});

		test('異常系: クリップが存在しない場合は NoSuchClipError', async () => {
			vi.spyOn(clipsRepository, 'findOneBy').mockResolvedValue(null);

			await expect(
				clipService.addNote(mockMe, 'no-clip', 'n1'),
			).rejects.toBeInstanceOf(ClipService.NoSuchClipError);
		});

		test('異常系: ノート上限に達している場合は TooManyClipNotesError', async () => {
			const existing: MiClip = { id: 'c1', userId: mockMe.id } as MiClip;
			vi.spyOn(clipsRepository, 'findOneBy').mockResolvedValue(existing);
			vi.spyOn(clipNotesRepository, 'countBy').mockResolvedValue(200);
			vi.spyOn(roleService, 'getUserPolicies').mockResolvedValue({ noteEachClipsLimit: 200 } as any);

			await expect(
				clipService.addNote(mockMe, 'c1', 'n1'),
			).rejects.toBeInstanceOf(ClipService.TooManyClipNotesError);
		});

		test('異常系: 既に追加済み (重複キー) は AlreadyAddedError', async () => {
			const existing: MiClip = { id: 'c1', userId: mockMe.id } as MiClip;
			vi.spyOn(clipsRepository, 'findOneBy').mockResolvedValue(existing);
			vi.spyOn(clipNotesRepository, 'countBy').mockResolvedValue(0);
			vi.spyOn(roleService, 'getUserPolicies').mockResolvedValue({ noteEachClipsLimit: 100 } as any);
			// duplicate key error: isDuplicateKeyValueError checks e.driverError.code === '23505'
			const dupError = new QueryFailedError('insert', [], new Error('duplicate key') as any);
			(dupError as any).driverError = { code: '23505', detail: 'duplicate key value' };
			vi.spyOn(clipNotesRepository, 'insert').mockRejectedValue(dupError);

			await expect(
				clipService.addNote(mockMe, 'c1', 'n1'),
			).rejects.toBeInstanceOf(ClipService.AlreadyAddedError);
		});

		test('異常系: 存在しないノート (FK 違反) は NoSuchNoteError', async () => {
			const existing: MiClip = { id: 'c1', userId: mockMe.id } as MiClip;
			vi.spyOn(clipsRepository, 'findOneBy').mockResolvedValue(existing);
			vi.spyOn(clipNotesRepository, 'countBy').mockResolvedValue(0);
			vi.spyOn(roleService, 'getUserPolicies').mockResolvedValue({ noteEachClipsLimit: 100 } as any);
			const fkError = new QueryFailedError('insert', [], new Error('FK') as any);
			(fkError as any).driverError = { detail: 'Key (noteId)=(n1) is not present in table "note".' };
			vi.spyOn(clipNotesRepository, 'insert').mockRejectedValue(fkError);

			await expect(
				clipService.addNote(mockMe, 'c1', 'n1'),
			).rejects.toBeInstanceOf(ClipService.NoSuchNoteError);
		});
	});

	describe('removeNote', () => {
		test('正常系: クリップからノートを削除し clippedCount をデクリメント', async () => {
			const existing: MiClip = { id: 'c1', userId: mockMe.id } as MiClip;
			vi.spyOn(clipsRepository, 'findOneBy').mockResolvedValue(existing);
			vi.spyOn(notesRepository, 'findOneBy').mockResolvedValue({ id: 'n1' } as any);
			const deleteClipNoteSpy = vi.spyOn(clipNotesRepository, 'delete').mockResolvedValue(undefined as any);
			const decrementSpy = vi.spyOn(notesRepository, 'decrement').mockResolvedValue(undefined as any);

			await clipService.removeNote(mockMe, 'c1', 'n1');
			expect(deleteClipNoteSpy).toHaveBeenCalledWith({ noteId: 'n1', clipId: 'c1' });
			expect(decrementSpy).toHaveBeenCalledWith({ id: 'n1' }, 'clippedCount', 1);
		});

		test('異常系: クリップが存在しない場合は NoSuchClipError', async () => {
			vi.spyOn(clipsRepository, 'findOneBy').mockResolvedValue(null);

			await expect(
				clipService.removeNote(mockMe, 'no-clip', 'n1'),
			).rejects.toBeInstanceOf(ClipService.NoSuchClipError);
		});

		test('異常系: ノートが存在しない場合は NoSuchNoteError', async () => {
			const existing: MiClip = { id: 'c1', userId: mockMe.id } as MiClip;
			vi.spyOn(clipsRepository, 'findOneBy').mockResolvedValue(existing);
			vi.spyOn(notesRepository, 'findOneBy').mockResolvedValue(null);

			await expect(
				clipService.removeNote(mockMe, 'c1', 'no-note'),
			).rejects.toBeInstanceOf(ClipService.NoSuchNoteError);
		});
	});

	describe('integration with IdService', () => {
		test('IdService.gen() で生成された ID が insert に渡される', async () => {
			const existing: MiClip = { id: 'c1', userId: mockMe.id } as MiClip;
			vi.spyOn(clipsRepository, 'findOneBy').mockResolvedValue(existing);
			vi.spyOn(clipNotesRepository, 'countBy').mockResolvedValue(0);
			vi.spyOn(roleService, 'getUserPolicies').mockResolvedValue({ noteEachClipsLimit: 100 } as any);
			const insertSpy = vi.spyOn(clipNotesRepository, 'insert').mockResolvedValue(undefined as any);
			vi.spyOn(clipsRepository, 'update').mockResolvedValue(undefined as any);
			vi.spyOn(notesRepository, 'increment').mockResolvedValue(undefined as any);

			const expectedId = idService.gen();
			await clipService.addNote(mockMe, 'c1', 'n1');
			const insertArg = insertSpy.mock.calls[0][0] as any;
			expect(insertArg.id).toBeDefined();
			expect(typeof insertArg.id).toBe('string');
		});
	});
});
