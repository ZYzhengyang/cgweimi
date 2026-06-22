/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class ScrapedContent1700000000000 {
	constructor() {
		this.name = 'ScrapedContent1700000000000';
	}

	async up(dataSource) {
		await dataSource.query(`
			CREATE TABLE "scraped_content" (
				"id" varchar(32) NOT NULL,
				"source" varchar(32) NOT NULL DEFAULT 'cara',
				"sourceId" varchar(32) NOT NULL,
				"author" varchar(256) NOT NULL,
				"authorUrl" varchar(512),
				"content" text,
				"imageUrls" jsonb NOT NULL DEFAULT '[]',
				"cosUrls" jsonb NOT NULL DEFAULT '[]',
				"tags" jsonb NOT NULL DEFAULT '[]',
				"category" varchar(64),
				"published" boolean NOT NULL DEFAULT false,
				"publishedNoteId" varchar(32),
				"errorMessage" text,
				"metadata" jsonb NOT NULL DEFAULT '{}',
				"createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
				"updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
				PRIMARY KEY ("id")
			)
		`);

		await dataSource.query(`
			CREATE UNIQUE INDEX "IDX_scraped_content_source_sourceId" ON "scraped_content" ("source", "sourceId")
		`);

		await dataSource.query(`
			CREATE INDEX "IDX_scraped_content_source" ON "scraped_content" ("source")
		`);

		await dataSource.query(`
			CREATE INDEX "IDX_scraped_content_published_createdAt" ON "scraped_content" ("published", "createdAt")
		`);

		await dataSource.query(`
			CREATE INDEX "IDX_scraped_content_source_createdAt" ON "scraped_content" ("source", "createdAt")
		`);
	}

	async down(dataSource) {
		await dataSource.query(`DROP TABLE IF EXISTS "scraped_content"`);
	}
}
