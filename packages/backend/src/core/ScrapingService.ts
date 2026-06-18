/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { ScrapedContentsRepository } from '@/models/_.js';
import type { Config } from '@/config.js';
import { MiScrapedContent, ScrapedContentSource } from '@/models/ScrapedContent.js';
import { IdService } from '@/core/IdService.js';
import Logger from '@/logger.js';
import { bindThis } from '@/decorators.js';
import { createTemp } from '@/misc/create-temp.js';
import { DownloadService } from '@/core/DownloadService.js';
import { HttpRequestService } from '@/core/HttpRequestService.js';

type CreateScrapedContentParams = {
	source: ScrapedContentSource;
	sourceId: string;
	author: string;
	authorUrl?: string | null;
	content?: string | null;
	imageUrls: string[];
	metadata?: Record<string, unknown>;
};

type UpdateScrapedContentParams = {
	id: string;
	cosUrls?: string[];
	tags?: string[];
	category?: string | null;
	published?: boolean;
	publishedNoteId?: string | null;
	errorMessage?: string | null;
};

@Injectable()
export class ScrapingService {
	private logger: Logger;

	constructor(
		@Inject(DI.config)
		private config: Config,

		@Inject(DI.scrapedContentsRepository)
		private scrapedContentsRepository: ScrapedContentsRepository,

		private idService: IdService,
		private downloadService: DownloadService,
		private httpRequestService: HttpRequestService,
	) {
		this.logger = new Logger('scraping', 'cyan');
	}

	/**
	 * 创建搬运记录
	 */
	@bindThis
	async create(params: CreateScrapedContentParams): Promise<MiScrapedContent> {
		const now = new Date();
		const scraped = new MiScrapedContent();
		scraped.id = this.idService.gen();
		scraped.source = params.source;
		scraped.sourceId = params.sourceId;
		scraped.author = params.author;
		scraped.authorUrl = params.authorUrl ?? null;
		scraped.content = params.content ?? null;
		scraped.imageUrls = params.imageUrls;
		scraped.cosUrls = [];
		scraped.tags = [];
		scraped.category = null;
		scraped.published = false;
		scraped.publishedNoteId = null;
		scraped.errorMessage = null;
		scraped.metadata = params.metadata ?? {};
		scraped.createdAt = now;
		scraped.updatedAt = now;

		this.logger.info(`创建搬运记录: ${params.source} - ${params.sourceId}`);

		return await this.scrapedContentsRepository.insertOne(scraped as any);
	}

	/**
	 * 检查是否已存在
	 */
	@bindThis
	async existsBySourceId(source: ScrapedContentSource, sourceId: string): Promise<boolean> {
		const existing = await this.scrapedContentsRepository.findOneBy({
			source: source,
			sourceId: sourceId,
		});
		return existing !== null;
	}

	/**
	 * 根据来源和源ID获取搬运记录
	 */
	@bindThis
	async findBySourceId(source: ScrapedContentSource, sourceId: string): Promise<MiScrapedContent | null> {
		return await this.scrapedContentsRepository.findOneBy({
			source: source,
			sourceId: sourceId,
		});
	}

	/**
	 * 更新搬运记录
	 */
	@bindThis
	async update(params: UpdateScrapedContentParams): Promise<MiScrapedContent | null> {
		const scraped = await this.scrapedContentsRepository.findOneBy({ id: params.id });
		if (!scraped) {
			return null;
		}

		if (params.cosUrls !== undefined) scraped.cosUrls = params.cosUrls;
		if (params.tags !== undefined) scraped.tags = params.tags;
		if (params.category !== undefined) scraped.category = params.category;
		if (params.published !== undefined) scraped.published = params.published;
		if (params.publishedNoteId !== undefined) scraped.publishedNoteId = params.publishedNoteId;
		if (params.errorMessage !== undefined) scraped.errorMessage = params.errorMessage;
		scraped.updatedAt = new Date();

		await this.scrapedContentsRepository.update(scraped.id, scraped as any);

		this.logger.info(`更新搬运记录: ${params.id}`);

		return scraped;
	}

	/**
	 * 标记为已发布
	 */
	@bindThis
	async markAsPublished(id: string, noteId: string): Promise<void> {
		await this.update({
			id,
			published: true,
			publishedNoteId: noteId,
		});
		this.logger.succ(`搬运内容已发布: ${id} -> ${noteId}`);
	}

	/**
	 * 标记为失败
	 */
	@bindThis
	async markAsFailed(id: string, error: string): Promise<void> {
		await this.update({
			id,
			errorMessage: error,
		});
		this.logger.warn(`搬运内容失败: ${id} - ${error}`);
	}

	/**
	 * 获取未发布的记录
	 */
	@bindThis
	async getUnpublished(limit: number = 10): Promise<MiScrapedContent[]> {
		return await this.scrapedContentsRepository.find({
			where: {
				published: false,
			},
			order: {
				createdAt: 'ASC',
			},
			take: limit,
		});
	}

	/**
	 * 获取搬运统计
	 */
	@bindThis
	async getStats(): Promise<{
		total: number;
		published: number;
		pending: number;
		failed: number;
		bySource: Record<string, number>;
	}> {
		const all = await this.scrapedContentsRepository.find();
		const published = all.filter(x => x.published).length;
		const failed = all.filter(x => x.errorMessage !== null).length;
		const pending = all.filter(x => !x.published && x.errorMessage === null).length;

		const bySource: Record<string, number> = {};
		for (const item of all) {
			bySource[item.source] = (bySource[item.source] || 0) + 1;
		}

		return {
			total: all.length,
			published,
			pending,
			failed,
			bySource,
		};
	}

	/**
	 * 下载图片到临时文件
	 */
	@bindThis
	async downloadImage(url: string): Promise<{ path: string; cleanup: () => void } | null> {
		try {
			const [path, cleanup] = await createTemp();
			await this.downloadService.downloadUrl(url, path);
			return { path, cleanup };
		} catch (err) {
			this.logger.error(`下载图片失败: ${url} - ${err}`);
			return null;
		}
	}

	/**
	 * 获取搬运列表
	 */
	@bindThis
	async list(params: {
		source?: ScrapedContentSource | null;
		published?: boolean | null;
		limit: number;
		offset: number;
	}): Promise<MiScrapedContent[]> {
		const where: Record<string, unknown> = {};

		if (params.source !== undefined && params.source !== null) {
			where.source = params.source;
		}
		if (params.published !== undefined && params.published !== null) {
			where.published = params.published;
		}

		return await this.scrapedContentsRepository.find({
			where,
			order: {
				createdAt: 'DESC',
			},
			take: params.limit,
			skip: params.offset,
		});
	}

	/**
	 * 同步搬运（测试用）
	 */
	@bindThis
	async syncOnce(source: ScrapedContentSource): Promise<{
		total: number;
		success: number;
		failed: number;
		skipped: number;
	}> {
		this.logger.info(`开始同步来源: ${source}`);

		// 根据来源获取内容
		const posts = await this.fetchFromSource(source);
		this.logger.info(`获取到 ${posts.length} 条内容`);

		let success = 0;
		let failed = 0;
		let skipped = 0;

		for (const post of posts) {
			// 检查是否已存在
			const exists = await this.existsBySourceId(source, post.sourceId);
			if (exists) {
				skipped++;
				continue;
			}

			try {
				await this.create({
					source: source,
					sourceId: post.sourceId,
					author: post.author,
					authorUrl: post.authorUrl,
					content: post.content,
					imageUrls: post.imageUrls,
					metadata: post.metadata,
				});
				success++;
			} catch (err) {
				failed++;
				this.logger.error(`处理失败: ${post.sourceId} - ${err}`);
			}
		}

		this.logger.info(`同步完成: 成功 ${success}, 失败 ${failed}, 跳过 ${skipped}`);

		return { total: posts.length, success, failed, skipped };
	}

	/**
	 * 从来源获取内容（需要子类实现）
	 */
	protected async fetchFromSource(source: ScrapedContentSource): Promise<Array<{
		sourceId: string;
		author: string;
		authorUrl?: string;
		content?: string;
		imageUrls: string[];
		metadata?: Record<string, unknown>;
	}>> {
		// 默认返回空，子类可覆盖
		this.logger.warn(`未实现的来源: ${source}`);
		return [];
	}
}
