/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

/**
 * @class
 * @implements {MigrationInterface}
 */
export class AddScrapedContent1782129128904 {
    name = 'AddScrapedContent1782129128904'

    /**
     * @param {QueryRunner} queryRunner
     */
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "scraped_content" ("id" character varying(32) NOT NULL, "source" character varying(32) NOT NULL, "sourceId" character varying(32) NOT NULL, "author" character varying(256) NOT NULL, "authorUrl" character varying(512), "content" text, "imageUrls" jsonb NOT NULL DEFAULT '[]', "cosUrls" jsonb NOT NULL DEFAULT '[]', "tags" jsonb NOT NULL DEFAULT '[]', "category" character varying(64), "published" boolean NOT NULL DEFAULT false, "publishedNoteId" character varying(32), "errorMessage" text, "metadata" jsonb NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_5383a319167b2000856256059f7" PRIMARY KEY ("id")); COMMENT ON COLUMN "scraped_content"."source" IS 'Content source platform'; COMMENT ON COLUMN "scraped_content"."sourceId" IS 'Original content ID from source platform'; COMMENT ON COLUMN "scraped_content"."author" IS 'Author name'; COMMENT ON COLUMN "scraped_content"."authorUrl" IS 'Author profile URL'; COMMENT ON COLUMN "scraped_content"."content" IS 'Content description or title'; COMMENT ON COLUMN "scraped_content"."imageUrls" IS 'Image URLs'; COMMENT ON COLUMN "scraped_content"."cosUrls" IS 'COS file URLs after upload'; COMMENT ON COLUMN "scraped_content"."tags" IS 'AI extracted tags'; COMMENT ON COLUMN "scraped_content"."category" IS 'Content category'; COMMENT ON COLUMN "scraped_content"."published" IS 'Whether the content has been published to Misskey'; COMMENT ON COLUMN "scraped_content"."publishedNoteId" IS 'Published note ID in Misskey'; COMMENT ON COLUMN "scraped_content"."errorMessage" IS 'Error message if scraping failed'; COMMENT ON COLUMN "scraped_content"."metadata" IS 'Additional metadata from source platform'; COMMENT ON COLUMN "scraped_content"."createdAt" IS 'Created date'; COMMENT ON COLUMN "scraped_content"."updatedAt" IS 'Updated date'`);
        await queryRunner.query(`CREATE INDEX "IDX_91c9e51deb752020af3cf5cf80" ON "scraped_content"  ("source") `);
        await queryRunner.query(`CREATE INDEX "IDX_2ba467bb92a884352f2f7e4c48" ON "scraped_content"  ("published") `);
        await queryRunner.query(`CREATE INDEX "IDX_11da14b3d26f1203c93c5a012a" ON "scraped_content"  ("source", "createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_9da71906b04484fe2beafbfa7a" ON "scraped_content"  ("published", "createdAt") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ec901f940bdf75b0543e17a5bb" ON "scraped_content"  ("source", "sourceId") `);
    }

    /**
     * @param {QueryRunner} queryRunner
     */
    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX "public"."IDX_ec901f940bdf75b0543e17a5bb"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9da71906b04484fe2beafbfa7a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_11da14b3d26f1203c93c5a012a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2ba467bb92a884352f2f7e4c48"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_91c9e51deb752020af3cf5cf80"`);
        await queryRunner.query(`DROP TABLE "scraped_content"`);
    }
}
