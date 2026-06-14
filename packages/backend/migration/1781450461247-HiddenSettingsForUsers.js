/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class HiddenSettingsForUsers1781450461247 {
	async up(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" ADD "hiddenSettingsForUsers" character varying(512) DEFAULT '{}'`);
		await queryRunner.query(`ALTER TABLE "meta" ADD "settingsPageLabels" character varying(512) DEFAULT '{}'`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "hiddenSettingsForUsers"`);
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "settingsPageLabels"`);
	}
}