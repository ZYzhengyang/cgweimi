/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class AddAdminMenuMeta1781436348303 {
    constructor() {
        this.name = 'AddAdminMenuMeta1781436348303';
    }

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" ADD "adminMenu" jsonb NOT NULL DEFAULT '{"hidden":[],"labels":{}}'`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "adminMenu"`);
    }
}
