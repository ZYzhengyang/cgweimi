/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class AddThirdPartyLoginFields1779983780515 {
    name = 'AddThirdPartyLoginFields1779983780515'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user" ADD "wechatOpenId" character varying(128)`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "UQ_user_wechatOpenId" UNIQUE ("wechatOpenId")`);
        await queryRunner.query(`CREATE INDEX "IDX_user_wechatOpenId" ON "user" ("wechatOpenId")`);
        
        await queryRunner.query(`ALTER TABLE "user" ADD "qqOpenId" character varying(128)`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "UQ_user_qqOpenId" UNIQUE ("qqOpenId")`);
        await queryRunner.query(`CREATE INDEX "IDX_user_qqOpenId" ON "user" ("qqOpenId")`);
        
        await queryRunner.query(`ALTER TABLE "user_profile" ADD "phone" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "user_profile" ADD CONSTRAINT "UQ_user_profile_phone" UNIQUE ("phone")`);
        await queryRunner.query(`CREATE INDEX "IDX_user_profile_phone" ON "user_profile" ("phone")`);
        
        await queryRunner.query(`ALTER TABLE "user_profile" ADD "phoneVerified" boolean NOT NULL DEFAULT false`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "user_profile" DROP COLUMN "phoneVerified"`);
        await queryRunner.query(`DROP INDEX "IDX_user_profile_phone"`);
        await queryRunner.query(`ALTER TABLE "user_profile" DROP CONSTRAINT "UQ_user_profile_phone"`);
        await queryRunner.query(`ALTER TABLE "user_profile" DROP COLUMN "phone"`);
        
        await queryRunner.query(`DROP INDEX "IDX_user_qqOpenId"`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "UQ_user_qqOpenId"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "qqOpenId"`);
        
        await queryRunner.query(`DROP INDEX "IDX_user_wechatOpenId"`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "UQ_user_wechatOpenId"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "wechatOpenId"`);
    }
}
