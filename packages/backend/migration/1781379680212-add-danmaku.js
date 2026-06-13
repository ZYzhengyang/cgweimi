/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class AddDanmaku1781379680212 {
    name = 'AddDanmaku1781379680212'

    /**
     * @param {QueryRunner} queryRunner
     */
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "mi_danmaku" ("id" character varying(32) NOT NULL, "userId" character varying(32) NOT NULL, "noteId" character varying(32) NOT NULL, "text" character varying(200) NOT NULL, "color" character varying(10), "time" real NOT NULL DEFAULT 0, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "PK_mi_danmaku_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_mi_danmaku_userId" ON "mi_danmaku" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_mi_danmaku_noteId" ON "mi_danmaku" ("noteId") `);
        await queryRunner.query(`CREATE INDEX "IDX_mi_danmaku_noteId_time" ON "mi_danmaku" ("noteId", "time") `);
        await queryRunner.query(`ALTER TABLE "mi_danmaku" ADD CONSTRAINT "FK_mi_danmaku_userId" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "mi_danmaku" ADD CONSTRAINT "FK_mi_danmaku_noteId" FOREIGN KEY ("noteId") REFERENCES "note"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    /**
     * @param {QueryRunner} queryRunner
     */
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "mi_danmaku" DROP CONSTRAINT "FK_mi_danmaku_noteId"`);
        await queryRunner.query(`ALTER TABLE "mi_danmaku" DROP CONSTRAINT "FK_mi_danmaku_userId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_mi_danmaku_noteId_time"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_mi_danmaku_noteId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_mi_danmaku_userId"`);
        await queryRunner.query(`DROP TABLE "mi_danmaku"`);
    }
}
