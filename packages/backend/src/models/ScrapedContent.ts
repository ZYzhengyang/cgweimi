/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { PrimaryColumn, Entity, Index, Column } from 'typeorm';
import { id } from './util/id.js';

export enum ScrapedContentSource {
	CARA = 'cara',
	YOUTUBE = 'youtube',
	ARTSTATION = 'artstation',
}

/**
 * 搬运记录实体
 * 记录从各个来源搬运的内容信息
 */
@Entity('scraped_content')
@Index(['source', 'sourceId'], { unique: true })
@Index(['published', 'createdAt'])
@Index(['source', 'createdAt'])
export class MiScrapedContent {
	@PrimaryColumn(id())
	public id: string;

	/**
	 * 内容来源：cara / youtube / artstation
	 */
	@Index()
	@Column({
		type: 'varchar',
		length: 32,
		comment: 'Content source platform',
	})
	public source: ScrapedContentSource;

	/**
	 * 原始内容 ID（来源平台的唯一标识）
	 */
	@Column({
		...id(),
		comment: 'Original content ID from source platform',
	})
	public sourceId: string;

	/**
	 * 作者名称
	 */
	@Column({
		type: 'varchar',
		length: 256,
		comment: 'Author name',
	})
	public author: string;

	/**
	 * 作者在来源平台的链接
	 */
	@Column({
		type: 'varchar',
		length: 512,
		nullable: true,
		comment: 'Author profile URL',
	})
	public authorUrl: string | null;

	/**
	 * 内容描述/标题
	 */
	@Column({
		type: 'text',
		nullable: true,
		comment: 'Content description or title',
	})
	public content: string | null;

	/**
	 * 图片 URL 列表
	 */
	@Column('jsonb', {
		default: [],
		comment: 'Image URLs',
	})
	public imageUrls: string[];

	/**
	 * 搬运后上传到 COS 的文件 URL 列表
	 */
	@Column('jsonb', {
		default: [],
		comment: 'COS file URLs after upload',
	})
	public cosUrls: string[];

	/**
	 * AI 提取的标签列表
	 */
	@Column('jsonb', {
		default: [],
		comment: 'AI extracted tags',
	})
	public tags: string[];

	/**
	 * 内容分类
	 */
	@Column({
		type: 'varchar',
		length: 64,
		nullable: true,
		comment: 'Content category',
	})
	public category: string | null;

	/**
	 * 是否已发布到 Misskey
	 */
	@Index()
	@Column('boolean', {
		default: false,
		comment: 'Whether the content has been published to Misskey',
	})
	public published: boolean;

	/**
	 * 发布后的帖子 ID
	 */
	@Column({
		...id(),
		nullable: true,
		comment: 'Published note ID in Misskey',
	})
	public publishedNoteId: string | null;

	/**
	 * 搬运失败时的错误信息
	 */
	@Column({
		type: 'text',
		nullable: true,
		comment: 'Error message if scraping failed',
	})
	public errorMessage: string | null;

	/**
	 * 元数据（来源平台的其他信息，如点赞数等）
	 */
	@Column('jsonb', {
		default: {},
		comment: 'Additional metadata from source platform',
	})
	public metadata: Record<string, unknown>;

	@Column({
		type: 'timestamp with time zone',
		comment: 'Created date',
	})
	public createdAt: Date;

	@Column({
		type: 'timestamp with time zone',
		comment: 'Updated date',
	})
	public updatedAt: Date;
}
