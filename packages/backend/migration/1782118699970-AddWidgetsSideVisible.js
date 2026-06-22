/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class AddWidgetsSideVisible1782118699970 {
    constructor() {
        this.name = 'AddWidgetsSideVisible1782118699970';
    }

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" ADD "widgetsSideVisible" boolean NOT NULL DEFAULT true`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "widgetsSideVisible"`);
    }
}
