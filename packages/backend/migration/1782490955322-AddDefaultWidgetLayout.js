/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class AddDefaultWidgetLayout1782490955322 {
	name = 'AddDefaultWidgetLayout1782490955322';

	async up(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" ADD "defaultWidgetLayout" jsonb`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "defaultWidgetLayout"`);
	}
}