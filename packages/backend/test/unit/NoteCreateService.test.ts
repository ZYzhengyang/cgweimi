/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';

import { CoreModule } from '@/core/CoreModule.js';
import { NoteCreateService } from '@/core/NoteCreateService.js';
import { GlobalModule } from '@/GlobalModule.js';
import { DI } from '@/di-symbols.js';
import { MiNote } from '@/models/Note.js';
import { MiUser } from '@/models/User.js';
import { MiChannel } from '@/models/Channel.js';
import { MiDriveFile } from '@/models/DriveFile.js';
import { IPoll } from '@/models/Poll.js';
import type { Repository } from 'typeorm';

// Mock minimum user
const mockUser: MiUser = {
	id: 'user-1',
	username: 'testuser',
	host: null,
	isBot: false,
	isCat: false,
	createdAt: new Date(),
	updatedAt: new Date(),
	lastFetchedAt: null,
	name: 'Test User',
	followersCount: 0,
	followingCount: 0,
	notesCount: 0,
} as unknown as MiUser;

// Mock note base
function makeMockNote(overrides: Partial<MiNote> = {}): MiNote {
	return {
		id: 'note-1',
		replyId: null,
		reply: null,
		renoteId: null,
		renote: null,
		threadId: null,
		text: null,
		name: null,
		cw: null,
		userId: 'user-1',
		user: mockUser,
		localOnly: false,
		reactionAcceptance: null,
		renoteCount: 0,
		repliesCount: 0,
		clippedCount: 0,
		pageCount: 0,
		reactions: {},
		visibility: 'public',
		uri: null,
		url: null,
		fileIds: [],
		attachedFileTypes: [],
		visibleUserIds: [],
		mentions: [],
		mentionedRemoteUsers: '',
		reactionAndUserPairCache: [],
		emojis: [],
		tags: [],
		hasPoll: false,
		channelId: null,
		channel: null,
		userHost: null,
		replyUserId: null,
		replyUserHost: null,
		renoteUserId: null,
		renoteUserHost: null,
		renoteChannelId: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	} as unknown as MiNote;
}

// Mock file
function makeMockFile(overrides: Partial<MiDriveFile> = {}): MiDriveFile {
	return {
		id: 'file-1',
		userId: 'user-1',
		user: mockUser,
		userHost: null,
		md5: 'd41d8cd98f00b204e9800998ecf8427e',
		name: 'test.png',
		type: 'image/png',
		size: 100,
		comment: null,
		blurhash: null,
		properties: { width: 100, height: 100 },
		storedInternal: false,
		url: 'https://example.com/test.png',
		thumbnailUrl: null,
		webpublicUrl: null,
		webpublicType: null,
		accessKey: null,
		thumbnailAccessKey: null,
		webpublicAccessKey: null,
		uri: null,
		src: null,
		folderId: null,
		folder: null,
		isSensitive: false,
		maybeSensitive: false,
		maybePorn: false,
		isLink: false,
		requestHeaders: null,
		requestIp: null,
		createdAt: new Date(),
		...overrides,
	} as unknown as MiDriveFile;
}

describe('NoteCreateService', () => {
	let app: TestingModule;
	let noteCreateService: NoteCreateService;
	let notesRepository: Repository<MiNote>;
	let usersRepository: Repository<MiUser>;
	let driveFilesRepository: Repository<MiDriveFile>;
	let channelsRepository: Repository<MiChannel>;
	let blockingsRepository: Repository<any>;

	beforeAll(async () => {
		app = await Test.createTestingModule({
			imports: [GlobalModule, CoreModule],
		}).compile();

		noteCreateService = app.get<NoteCreateService>(NoteCreateService);
		notesRepository = app.get<Repository<MiNote>>(DI.notesRepository);
		usersRepository = app.get<Repository<MiUser>>(DI.usersRepository);
		driveFilesRepository = app.get<Repository<MiDriveFile>>(DI.driveFilesRepository);
		channelsRepository = app.get<Repository<MiChannel>>(DI.channelsRepository);
		blockingsRepository = app.get<Repository<any>>(DI.blockingsRepository);
	});

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	describe('isRenote / isQuote helpers', () => {
		const poll: IPoll = {
			choices: ['a', 'b'],
			multiple: false,
			expiresAt: null,
		};

		test('note without renote should not be Renote', () => {
			const note = { renote: null };
			expect(noteCreateService['isRenote'](note)).toBe(false);
		});

		test('note with renote should be Renote and not be Quote', () => {
			const note = { renote: makeMockNote() };
			expect(noteCreateService['isRenote'](note)).toBe(true);
			expect(noteCreateService['isQuote'](note)).toBe(false);
		});

		test('note with renote and text should be Quote', () => {
			const note = { renote: makeMockNote(), text: 'some comment' };
			expect(noteCreateService['isRenote'](note)).toBe(true);
			expect(noteCreateService['isQuote'](note)).toBe(true);
		});

		test('note with renote and cw should be Quote', () => {
			const note = { renote: makeMockNote(), cw: 'content warning' };
			expect(noteCreateService['isRenote'](note)).toBe(true);
			expect(noteCreateService['isQuote'](note)).toBe(true);
		});

		test('note with renote and reply should be Quote', () => {
			const note = {
				renote: makeMockNote(),
				reply: makeMockNote({ id: 'reply-note' }),
			};
			expect(noteCreateService['isRenote'](note)).toBe(true);
			expect(noteCreateService['isQuote'](note)).toBe(true);
		});

		test('note with renote and poll should be Quote', () => {
			const note = { renote: makeMockNote(), poll };
			expect(noteCreateService['isRenote'](note)).toBe(true);
			expect(noteCreateService['isQuote'](note)).toBe(true);
		});

		test('note with renote and non-empty files should be Quote', () => {
			const note = { renote: makeMockNote(), files: [makeMockFile()] };
			expect(noteCreateService['isRenote'](note)).toBe(true);
			expect(noteCreateService['isQuote'](note)).toBe(true);
		});
	});

	describe('fetchAndCreate - validation errors', () => {
		describe('reply', () => {
			test('should throw if reply target not found', async () => {
				vi.spyOn(notesRepository, 'findOne').mockResolvedValue(null);

				const noteData = {
					createdAt: new Date(),
					replyId: 'nonexistent-reply',
					renoteId: null,
					fileIds: [],
					text: 'Reply to nothing',
					cw: null,
					visibility: 'public',
					visibleUserIds: [],
					channelId: null,
					localOnly: false,
					reactionAcceptance: null,
					poll: null,
				};

				await expect(
					noteCreateService.fetchAndCreate(mockUser, noteData),
				).rejects.toThrow('No such reply target');
			});

			test('should throw when replying to pure renote', async () => {
				const pureRenote = makeMockNote({
					id: 'pure-renote',
					renoteId: 'original-note',
					text: null,
				});

				vi.spyOn(notesRepository, 'findOne').mockResolvedValue(pureRenote);

				const noteData = {
					createdAt: new Date(),
					replyId: 'pure-renote',
					renoteId: null,
					fileIds: [],
					text: 'Reply to renote',
					cw: null,
					visibility: 'public',
					visibleUserIds: [],
					channelId: null,
					localOnly: false,
					reactionAcceptance: null,
					poll: null,
				};

				await expect(
					noteCreateService.fetchAndCreate(mockUser, noteData),
				).rejects.toThrow('Cannot reply to pure renote');
			});

			test('should throw when blocked by reply target user', async () => {
				const parentNote = makeMockNote({
					id: 'parent-note',
					userId: 'blocker-user',
					user: { ...mockUser, id: 'blocker-user' } as MiUser,
				});

				vi.spyOn(notesRepository, 'findOne').mockResolvedValue(parentNote);
				vi.spyOn(blockingsRepository, 'exists').mockResolvedValue(true);

				const noteData = {
					createdAt: new Date(),
					replyId: 'parent-note',
					renoteId: null,
					fileIds: [],
					text: 'Reply to blocked user',
					cw: null,
					visibility: 'public',
					visibleUserIds: [],
					channelId: null,
					localOnly: false,
					reactionAcceptance: null,
					poll: null,
				};

				await expect(
					noteCreateService.fetchAndCreate(mockUser, noteData),
				).rejects.toThrow('You have been blocked');
			});
		});

		describe('renote', () => {
			test('should throw if renote target not found', async () => {
				vi.spyOn(notesRepository, 'findOne').mockResolvedValue(null);

				const noteData = {
					createdAt: new Date(),
					replyId: null,
					renoteId: 'nonexistent-renote',
					fileIds: [],
					text: null,
					cw: null,
					visibility: 'public',
					visibleUserIds: [],
					channelId: null,
					localOnly: false,
					reactionAcceptance: null,
					poll: null,
				};

				await expect(
					noteCreateService.fetchAndCreate(mockUser, noteData),
				).rejects.toThrow('No such renote target');
			});

			test('should throw when renote pure renote', async () => {
				const pureRenote = makeMockNote({
					id: 'pure-renote',
					renoteId: 'original-note',
					text: null,
				});

				vi.spyOn(notesRepository, 'findOne').mockResolvedValue(pureRenote);

				const noteData = {
					createdAt: new Date(),
					replyId: null,
					renoteId: 'pure-renote',
					fileIds: [],
					text: null,
					cw: null,
					visibility: 'public',
					visibleUserIds: [],
					channelId: null,
					localOnly: false,
					reactionAcceptance: null,
					poll: null,
				};

				await expect(
					noteCreateService.fetchAndCreate(mockUser, noteData),
				).rejects.toThrow('Cannot renote pure renote');
			});

			test('should throw when blocked by renote target user', async () => {
				const originalNote = makeMockNote({
					id: 'original-note',
					userId: 'blocker-user',
					visibility: 'public',
					userHost: null,
				});

				vi.spyOn(notesRepository, 'findOne').mockResolvedValue(originalNote);
				vi.spyOn(blockingsRepository, 'exists').mockResolvedValue(true);

				const noteData = {
					createdAt: new Date(),
					replyId: null,
					renoteId: 'original-note',
					fileIds: [],
					text: null,
					cw: null,
					visibility: 'public',
					visibleUserIds: [],
					channelId: null,
					localOnly: false,
					reactionAcceptance: null,
					poll: null,
				};

				await expect(
					noteCreateService.fetchAndCreate(mockUser, noteData),
				).rejects.toThrow('You have been blocked');
			});

			test('should throw when renote followers-only note from other user', async () => {
				const followersNote = makeMockNote({
					id: 'followers-note',
					visibility: 'followers',
					userId: 'other-user',
					userHost: null,
				});

				vi.spyOn(notesRepository, 'findOne').mockResolvedValue(followersNote);
				vi.spyOn(blockingsRepository, 'exists').mockResolvedValue(false);

				const noteData = {
					createdAt: new Date(),
					replyId: null,
					renoteId: 'followers-note',
					fileIds: [],
					text: null,
					cw: null,
					visibility: 'public',
					visibleUserIds: [],
					channelId: null,
					localOnly: false,
					reactionAcceptance: null,
					poll: null,
				};

				await expect(
					noteCreateService.fetchAndCreate(mockUser, noteData),
				).rejects.toThrow('Renote target visibility');
			});

			test('should throw when renote specified note', async () => {
				const specifiedNote = makeMockNote({
					id: 'specified-note',
					visibility: 'specified',
					visibleUserIds: ['specific-user'],
				});

				vi.spyOn(notesRepository, 'findOne').mockResolvedValue(specifiedNote);

				const noteData = {
					createdAt: new Date(),
					replyId: null,
					renoteId: 'specified-note',
					fileIds: [],
					text: null,
					cw: null,
					visibility: 'public',
					visibleUserIds: [],
					channelId: null,
					localOnly: false,
					reactionAcceptance: null,
					poll: null,
				};

				await expect(
					noteCreateService.fetchAndCreate(mockUser, noteData),
				).rejects.toThrow('Renote target visibility');
			});
		});

		describe('channel', () => {
			test('should throw if channel not found', async () => {
				vi.spyOn(channelsRepository, 'findOneBy').mockResolvedValue(null);

				const noteData = {
					createdAt: new Date(),
					replyId: null,
					renoteId: null,
					fileIds: [],
					text: 'Note in nonexistent channel',
					cw: null,
					visibility: 'public',
					visibleUserIds: [],
					channelId: 'nonexistent-channel',
					localOnly: false,
					reactionAcceptance: null,
					poll: null,
				};

				await expect(
					noteCreateService.fetchAndCreate(mockUser, noteData),
				).rejects.toThrow('No such channel');
			});
		});

		describe('files', () => {
			test('should throw if file not found', async () => {
				vi.spyOn(driveFilesRepository, 'createQueryBuilder').mockReturnValue({
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					setParameters: vi.fn().mockReturnThis(),
					getMany: vi.fn().mockResolvedValue([]),
				} as any);

				const noteData = {
					createdAt: new Date(),
					replyId: null,
					renoteId: null,
					fileIds: ['nonexistent-file'],
					text: 'Note with missing file',
					cw: null,
					visibility: 'public',
					visibleUserIds: [],
					channelId: null,
					localOnly: false,
					reactionAcceptance: null,
					poll: null,
				};

				await expect(
					noteCreateService.fetchAndCreate(mockUser, noteData),
				).rejects.toThrow('No such file');
			});

			test('should throw if some files not found', async () => {
				const mockFile = makeMockFile({ id: 'file-1', userId: mockUser.id });

				vi.spyOn(driveFilesRepository, 'createQueryBuilder').mockReturnValue({
					where: vi.fn().mockReturnThis(),
					orderBy: vi.fn().mockReturnThis(),
					setParameters: vi.fn().mockReturnThis(),
					getMany: vi.fn().mockResolvedValue([mockFile]), // only 1 of 2 files
				} as any);

				const noteData = {
					createdAt: new Date(),
					replyId: null,
					renoteId: null,
					fileIds: ['file-1', 'file-2'], // requesting 2 files
					text: 'Note with missing files',
					cw: null,
					visibility: 'public',
					visibleUserIds: [],
					channelId: null,
					localOnly: false,
					reactionAcceptance: null,
					poll: null,
				};

				await expect(
					noteCreateService.fetchAndCreate(mockUser, noteData),
				).rejects.toThrow('No such file');
			});
		});

		describe('poll', () => {
			test('should throw if poll expires in past', async () => {
				const expiredPoll: IPoll = {
					choices: ['Option A', 'Option B'],
					multiple: false,
					expiresAt: new Date(Date.now() - 1000),
				};

				const noteData = {
					createdAt: new Date(),
					replyId: null,
					renoteId: null,
					fileIds: [],
					text: 'Expired poll',
					cw: null,
					visibility: 'public',
					visibleUserIds: [],
					channelId: null,
					localOnly: false,
					reactionAcceptance: null,
					poll: expiredPoll,
				};

				await expect(
					noteCreateService.fetchAndCreate(mockUser, noteData),
				).rejects.toThrow('Poll expiration must be future time');
			});
		});
	});

	describe('checkProhibitedWordsContain', () => {
		test('should detect prohibited words in text', () => {
			const result = noteCreateService.checkProhibitedWordsContain(
				{ text: 'Hello prohibited-word world' },
				['prohibited-word'],
			);
			expect(result).toBe(true);
		});

		test('should return false when no prohibited words', () => {
			const result = noteCreateService.checkProhibitedWordsContain(
				{ text: 'Hello clean world' },
				['prohibited-word'],
			);
			expect(result).toBe(false);
		});

		test('should check CW for prohibited words', () => {
			const result = noteCreateService.checkProhibitedWordsContain(
				{ cw: 'CW with badword' },
				['badword'],
			);
			expect(result).toBe(true);
		});

		test('should check poll choices for prohibited words', () => {
			const result = noteCreateService.checkProhibitedWordsContain(
				{ pollChoices: ['Choice 1', 'Choice with spam'] },
				['spam'],
			);
			expect(result).toBe(true);
		});

		test('should return false for empty content', () => {
			const result = noteCreateService.checkProhibitedWordsContain(
				{},
				['badword'],
			);
			expect(result).toBe(false);
		});

		test('should return false when prohibitedWords is undefined', () => {
			const result = noteCreateService.checkProhibitedWordsContain(
				{ text: 'some text' },
				undefined,
			);
			expect(result).toBe(false);
		});
	});
});