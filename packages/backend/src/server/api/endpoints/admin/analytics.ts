/*
 * SPDX-FileCopyrightText: CGVMI
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { IsNull, MoreThan, In } from 'typeorm';
import type { DataSource } from 'typeorm';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import type {
	UsersRepository,
	NotesRepository,
	NoteReactionsRepository,
	DriveFilesRepository,
	AccessTokensRepository,
} from '@/models/_.js';
import NotesChart from '@/core/chart/charts/notes.js';
import UsersChart from '@/core/chart/charts/users.js';
import ActiveUsersChart from '@/core/chart/charts/active-users.js';
import DriveChart from '@/core/chart/charts/drive.js';

export const meta = {
	requireCredential: true,
	requireAdmin: true,
	kind: 'read:admin:analytics',

	tags: ['admin'],

	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			// 基础统计
			totalUsers: { type: 'number' },
			totalNotes: { type: 'number' },
			totalReactions: { type: 'number' },
			totalDriveUsage: { type: 'number' },
			totalDriveFiles: { type: 'number' },
			onlineUsers: { type: 'number' },
			// 新增数据（时间段内）
			newUsers: { type: 'number' },
			newNotes: { type: 'number' },
			newReactions: { type: 'number' },
			newDriveUsage: { type: 'number' },
			newDriveFiles: { type: 'number' },
			activeUsers: { type: 'number' },
			// 图表数据
			usersChart: { type: 'object' },
			notesChart: { type: 'object' },
			reactionsChart: { type: 'object' },
			driveChart: { type: 'object' },
			activeUsersChart: { type: 'object' },
			// Top 数据
			topPosters: { type: 'array' },
			topReactedNotes: { type: 'array' },
			// 时间范围
			span: { type: 'string' },
			startDate: { type: 'string' },
			endDate: { type: 'string' },
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		span: { type: 'string', enum: ['day', 'week', 'month'], default: 'week' },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		@Inject(DI.notesRepository)
		private notesRepository: NotesRepository,

		@Inject(DI.noteReactionsRepository)
		private noteReactionsRepository: NoteReactionsRepository,

		@Inject(DI.driveFilesRepository)
		private driveFilesRepository: DriveFilesRepository,

		@Inject(DI.accessTokensRepository)
		private accessTokensRepository: AccessTokensRepository,

		@Inject(DI.db)
		private db: DataSource,

		private notesChart: NotesChart,
		private usersChart: UsersChart,
		private activeUsersChart: ActiveUsersChart,
		private driveChart: DriveChart,
	) {
		super(meta, paramDef, async (ps, me) => {
			const span = ps.span || 'week';
			const limit = span === 'day' ? 24 : span === 'week' ? 7 : 30;
			const spanHours = span === 'day' ? 24 : span === 'week' ? 168 : 720;

			// 计算时间范围
			const endDate = new Date();
			const startDate = new Date(endDate.getTime() - spanHours * 60 * 60 * 1000);

			// 并行获取所有数据
			const [
				usersChartData,
				notesChartData,
				activeUsersChartData,
				driveChartData,
				// 总数
				totalUsers,
				totalNotes,
				totalReactions,
				totalDriveFiles,
				// 在线用户
				onlineUsers,
			] = await Promise.all([
				this.usersChart.getChart('hour', limit, null),
				this.notesChart.getChart('hour', limit, null),
				this.activeUsersChart.getChart('hour', limit, null),
				this.driveChart.getChart('hour', limit, null),
				// 总用户数
				this.usersRepository.count({ where: { host: IsNull() } }),
				// 总帖子数
				this.notesRepository.count({ where: { deletedAt: IsNull() } }),
				// 总反应数
				this.noteReactionsRepository.count(),
				// 总文件数
				this.driveFilesRepository.count({ where: { isLink: false } }),
				// 在线用户（最近活跃的token）
				this.accessTokensRepository.count({
					where: { lastUsedAt: MoreThan(new Date(Date.now() - 5 * 60 * 1000)) },
				}),
			]);

			// 计算时间段内的新增数据
			const newUsers = usersChartData.local.inc.reduce((a: number, b: number) => a + b, 0);
			const newNotes = notesChartData.local.inc.reduce((a: number, b: number) => a + b, 0);
			const newDriveUsage = driveChartData.local.inc.reduce((a: number, b: number) => a + b, 0);
			const newDriveFiles = driveChartData.local.incFiles.reduce((a: number, b: number) => a + b, 0);
			const activeUsers = activeUsersChartData.local.inc.reduce((a: number, b: number) => a + b, 0);

			// 简化图表数据
			const simplifyChart = (data: any) => ({
				labels: data.map((_: any, i: number) => span === 'day' ? `${i}时` : `第${i + 1}天`),
				inc: data.local.inc,
				total: data.local.total,
			});

			// 获取 Top 发帖用户
			const topPosters = await this.notesRepository
				.createQueryBuilder('note')
				.select('note.userId', 'userId')
				.addSelect('COUNT(*)', 'count')
				.where('note.createdAt > :startDate', { startDate })
				.andWhere('note.deletedAt IS NULL')
				.groupBy('note.userId')
				.orderBy('count', 'DESC')
				.limit(10)
				.getRawMany();

			// 获取 Top 反应帖子
			const topReactedNotes = await this.noteReactionsRepository
				.createQueryBuilder('reaction')
				.select('reaction.noteId', 'noteId')
				.addSelect('COUNT(*)', 'count')
				.where('reaction.createdAt > :startDate', { startDate })
				.groupBy('reaction.noteId')
				.orderBy('count', 'DESC')
				.limit(10)
				.getRawMany();

			// 获取用户信息
			let topPostersWithInfo: any[] = [];
			if (topPosters.length > 0) {
				const userIds = topPosters.map((p: any) => p.userId);
				const users = await this.usersRepository.find({
					where: { id: In(userIds) },
					select: ['id', 'username', 'name', 'avatarUrl'],
				});
				const userMap = new Map(users.map((u: any) => [u.id, u]));
				topPostersWithInfo = topPosters.map((p: any) => ({
					userId: p.userId,
					count: parseInt(p.count),
					user: userMap.get(p.userId) || null,
				}));
			}

			// 获取帖子信息
			let topReactedNotesWithInfo: any[] = [];
			if (topReactedNotes.length > 0) {
				const noteIds = topReactedNotes.map((n: any) => n.noteId);
				const notes = await this.notesRepository.find({
					where: { id: In(noteIds) },
					select: ['id', 'userId', 'text', 'createdAt'],
				});
				const noteMap = new Map(notes.map((n: any) => [n.id, n]));
				topReactedNotesWithInfo = topReactedNotes.map((n: any) => ({
					noteId: n.noteId,
					count: parseInt(n.count),
					note: noteMap.get(n.noteId) || null,
				}));
			}

			return {
				// 基础统计
				totalUsers,
				totalNotes,
				totalReactions,
				totalDriveUsage: driveChartData.local.total[driveChartData.local.total.length - 1] || 0,
				totalDriveFiles,
				onlineUsers,
				// 新增数据
				newUsers,
				newNotes,
				newReactions: 0,
				newDriveUsage,
				newDriveFiles,
				activeUsers,
				// 图表数据
				usersChart: simplifyChart(usersChartData),
				notesChart: simplifyChart(notesChartData),
				reactionsChart: { labels: [], inc: [], total: [] },
				driveChart: {
					labels: driveChartData.map((_: any, i: number) => span === 'day' ? `${i}时` : `第${i + 1}天`),
					inc: driveChartData.local.inc,
					total: driveChartData.local.total,
				},
				activeUsersChart: simplifyChart(activeUsersChartData),
				// Top 数据
				topPosters: topPostersWithInfo,
				topReactedNotes: topReactedNotesWithInfo,
				// 时间范围
				span,
				startDate: startDate.toISOString(),
				endDate: endDate.toISOString(),
			};
		});
	}
}
