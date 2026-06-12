/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class DeepseekConfig1780000000000 {
	constructor() {
		this.name = 'DeepseekConfig1780000000000';
	}

	async up(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" ADD "deepseekApiKey" character varying(1024)`);
		await queryRunner.query(`ALTER TABLE "meta" ADD "deepseekApiUrl" character varying(1024)`);
		await queryRunner.query(`ALTER TABLE "meta" ADD "deepseekModel" character varying(256)`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "deepseekModel"`);
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "deepseekApiUrl"`);
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "deepseekApiKey"`);
	}
}
