/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class AddHiddenWidgets1781370641857 {
    constructor() {
        this.name = 'AddHiddenWidgets1781370641857';
    }

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" ADD "hiddenWidgets" character varying(1024) array NOT NULL DEFAULT '{}'`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "hiddenWidgets"`);
    }
}
