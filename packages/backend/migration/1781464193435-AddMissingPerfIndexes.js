/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

const isConcurrentIndexMigrationEnabled = process.env.MISSKEY_MIGRATION_CREATE_INDEX_CONCURRENTLY === '1';

export class AddMissingPerfIndexes1781464193435 {
	name = 'AddMissingPerfIndexes1781464193435';
	transaction = isConcurrentIndexMigrationEnabled ? false : undefined;

	async up(queryRunner) {
		const concurrently = isConcurrentIndexMigrationEnabled;

		// Index on user_profile.emailVerifyCode for verify-email endpoint lookups
		if (concurrently) {
			await queryRunner.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_USERPROFILE_EMAIL_VERIFY_CODE" ON "user_profile" ("emailVerifyCode")`);
		} else {
			await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_USERPROFILE_EMAIL_VERIFY_CODE" ON "user_profile" ("emailVerifyCode")`);
		}

		// Composite index on note_draft(scheduledAt, isActuallyScheduled) for scheduled post queries
		if (concurrently) {
			await queryRunner.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS "IDX_NOTEDRAFT_SCHEDULED" ON "note_draft" ("scheduledAt", "isActuallyScheduled")`);
		} else {
			await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_NOTEDRAFT_SCHEDULED" ON "note_draft" ("scheduledAt", "isActuallyScheduled")`);
		}
	}

	async down(queryRunner) {
		await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_NOTEDRAFT_SCHEDULED"`);
		await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_USERPROFILE_EMAIL_VERIFY_CODE"`);
	}
}
