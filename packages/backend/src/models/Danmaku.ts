/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { PrimaryColumn, Entity, Index, JoinColumn, Column, ManyToOne } from 'typeorm';
import { id } from './util/id.js';
import { MiUser } from './User.js';
import { MiNote } from './Note.js';

@Entity('mi_danmaku')
@Index(['noteId', 'time'])
export class MiDanmaku {
	@PrimaryColumn(id())
	public id: string;

	@Index()
	@Column(id())
	public userId: MiUser['id'];

	@ManyToOne(() => MiUser, {
		onDelete: 'CASCADE',
	})
	@JoinColumn()
	public user?: MiUser | null;

	@Index()
	@Column(id())
	public noteId: MiNote['id'];

	@ManyToOne(() => MiNote, {
		onDelete: 'CASCADE',
	})
	@JoinColumn()
	public note?: MiNote | null;

	@Column('varchar', {
		length: 200,
	})
	public text: string;

	@Column('varchar', {
		length: 10,
		nullable: true,
	})
	public color: string | null;

	@Column('real', {
		default: 0,
	})
	public time: number;

	@Column('timestamp with time zone', {
		default: () => 'CURRENT_TIMESTAMP',
	})
	public createdAt: Date;
}
