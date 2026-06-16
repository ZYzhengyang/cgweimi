/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class AddHotkeyConfig1781375612636 {
    constructor() {
        this.name = 'AddHotkeyConfig1781375612636';
    }

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" ADD "hotkeyConfig" jsonb NOT NULL DEFAULT '{}'`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "hotkeyConfig"`);
    }
}
