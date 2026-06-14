import * as fs from 'fs/promises';
import url from 'node:url';
import path from 'node:path';
import { execa } from 'execa';
import locales from 'i18n';
import { LocaleInliner } from '../frontend-builder/locale-inliner.js'
import { createLogger } from '../frontend-builder/logger';

// requires node 21 or later
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const outputDir = __dirname + '/../../built/_frontend_vite_';

/**
 * Filter locales based on ENABLED_LOCALES env var.
 * When set (comma-separated locale codes like "zh-CN,en-US"), only those locales are built.
 * Default: all locales (backward compatible).
 */
function getEnabledLocales(allLocales: typeof locales): typeof locales {
	const enabledLocales = process.env.ENABLED_LOCALES;
	if (!enabledLocales) {
		return allLocales;
	}

	const allowed = new Set(enabledLocales.split(',').map(s => s.trim()).filter(Boolean));
	const filtered: Record<string, any> = {};
	for (const [key, value] of Object.entries(allLocales)) {
		if (allowed.has(key)) {
			filtered[key] = value;
		}
	}

	if (Object.keys(filtered).length === 0) {
		console.warn(`[build] ENABLED_LOCALES="${enabledLocales}" matched no locales. Falling back to all locales.`);
		return allLocales;
	}

	console.log(`[build] Building only locales: ${Object.keys(filtered).join(', ')}`);
	return filtered as typeof locales;
}

/**
 * @return {Promise<void>}
 */
async function viteBuild() {
	await execa('vite', ['build'], {
		cwd: __dirname,
		stdout: process.stdout,
		stderr: process.stderr,
	});
}


async function buildAllLocale() {
	const logger = createLogger()
	const inliner = await LocaleInliner.create({
		outputDir,
		logger,
		scriptsDir: 'scripts',
		i18nFile: 'src/i18n.ts',
	})

	await inliner.loadFiles();

	inliner.collectsModifications();

	const enabledLocales = getEnabledLocales(locales);
	await inliner.saveAllLocales(enabledLocales);

	if (logger.errorCount > 0) {
		throw new Error(`Build failed with ${logger.errorCount} errors and ${logger.warningCount} warnings.`);
	}
}

async function build() {
	await fs.rm(outputDir, { recursive: true, force: true });
	await viteBuild();
	await buildAllLocale();
}

await build();
