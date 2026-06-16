/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';

import { CoreModule } from '@/core/CoreModule.js';
import { UtilityService } from '@/core/UtilityService.js';
import { GlobalModule } from '@/GlobalModule.js';
import { DI } from '@/di-symbols.js';
import type { MiMeta } from '@/models/Meta.js';

describe('UtilityService', () => {
	let app: TestingModule;
	let service: UtilityService;
	let meta: MiMeta;

	const baseMeta: MiMeta = {
		id: 'x',
		federation: 'all',
		federationHosts: [],
		blockedHosts: [],
		silencedHosts: [],
		mediaSilencedHosts: [],
		hiddenTags: [],
		sensitiveWords: [],
		deliverSuspendedSoftware: [],
	} as unknown as MiMeta;

	beforeAll(async () => {
		app = await Test.createTestingModule({
			imports: [GlobalModule, CoreModule],
		}).compile();
		service = app.get<UtilityService>(UtilityService);
		meta = app.get<MiMeta>(DI.meta);
	});

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	describe('getFullApAccount', () => {
		test('host あり: "user@host"', () => {
			expect(service.getFullApAccount('alice', 'example.com')).toBe('alice@example.com');
		});

		test('host が ASCII 以外でも punycode 変換される', () => {
			expect(service.getFullApAccount('alice', '例え.com')).toBe('alice@xn--r8jz45g.com');
		});

		test('host=null のときは config.host を使用', () => {
			const config = app.get<any>(DI.config);
			const result = service.getFullApAccount('alice', null);
			expect(result).toBe(`alice@${service.toPuny(config.host)}`);
		});
	});

	describe('isSelfHost', () => {
		test('null は true (ローカル)', () => {
			expect(service.isSelfHost(null)).toBe(true);
		});

		test('config.host と同じなら true', () => {
			const config = app.get<any>(DI.config);
			expect(service.isSelfHost(config.host)).toBe(true);
		});

		test('他ホストは false', () => {
			expect(service.isSelfHost('other.tld')).toBe(false);
		});

		test('大文字小文字は区別しない (punycode 化後)', () => {
			const config = app.get<any>(DI.config);
			expect(service.isSelfHost(config.host.toUpperCase())).toBe(true);
		});
	});

	describe('isUriLocal', () => {
		test('config.host の URL なら true', () => {
			const config = app.get<any>(DI.config);
			// eslint-disable-next-line no-console
			console.log('DEBUG config.host:', config.host, 'config.url:', config.url);
			expect(service.isUriLocal(`${config.url}/users/abc`)).toBe(true);
		});

		test('他ホストの URL は false', () => {
			expect(service.isUriLocal('https://other.tld/users/abc')).toBe(false);
		});

		test('不正な URL は throw (new URL エラー)', () => {
			expect(() => service.isUriLocal('not-a-url')).toThrow();
		});
	});

	describe('validateEmailFormat', () => {
		test('正常なメールアドレス → true', () => {
			expect(service.validateEmailFormat('user@example.com')).toBe(true);
			expect(service.validateEmailFormat('a.b+c@sub.example.co.uk')).toBe(true);
		});

		test('@なし → false', () => {
			expect(service.validateEmailFormat('userexample.com')).toBe(false);
		});

		test('空文字列 → false', () => {
			expect(service.validateEmailFormat('')).toBe(false);
		});

		test('スペース → false', () => {
			expect(service.validateEmailFormat('user @example.com')).toBe(false);
		});

		test('不正な文字 → false', () => {
			expect(service.validateEmailFormat('user<>@example.com')).toBe(false);
		});
	});

	describe('isBlockedHost', () => {
		test('null host → false', () => {
			expect(service.isBlockedHost(['evil.com'], null)).toBe(false);
		});

		test('空 blockedHosts → false', () => {
			expect(service.isBlockedHost([], 'evil.com')).toBe(false);
		});

		test('完全一致でブロック → true', () => {
			expect(service.isBlockedHost(['evil.com'], 'evil.com')).toBe(true);
		});

		test('サブドメイン一致でブロック → true', () => {
			expect(service.isBlockedHost(['evil.com'], 'sub.evil.com')).toBe(true);
		});

		test('部分一致 (非境界) は false', () => {
			expect(service.isBlockedHost(['evil.com'], 'notevil.com')).toBe(false);
		});

		test('大文字小文字を区別しない', () => {
			expect(service.isBlockedHost(['EVIL.COM'], 'evil.com')).toBe(true);
		});
	});

	describe('isSilencedHost', () => {
		test('null silencedHosts → false', () => {
			expect(service.isSilencedHost(undefined, 'evil.com')).toBe(false);
		});

		test('null host → false', () => {
			expect(service.isSilencedHost(['evil.com'], null)).toBe(false);
		});

		test('完全一致 → true', () => {
			expect(service.isSilencedHost(['evil.com'], 'evil.com')).toBe(true);
		});

		test('サブドメイン一致 → true', () => {
			expect(service.isSilencedHost(['evil.com'], 'sub.evil.com')).toBe(true);
		});
	});

	describe('isMediaSilencedHost', () => {
		test('完全一致 (大文字小文字無視) → true', () => {
			expect(service.isMediaSilencedHost(['evil.com'], 'EVIL.COM')).toBe(true);
		});

		test('サブドメインは一致しない (isBlockedHost と違い完全一致のみ)', () => {
			expect(service.isMediaSilencedHost(['evil.com'], 'sub.evil.com')).toBe(false);
		});

		test('null host → false', () => {
			expect(service.isMediaSilencedHost(['evil.com'], null)).toBe(false);
		});
	});

	describe('concatNoteContentsForKeyWordCheck', () => {
		test('cw + text を空白なしで結合', () => {
			const result = service.concatNoteContentsForKeyWordCheck({ cw: '警告', text: '本文' });
			expect(result).toBe('警告本文\n\n');
		});

		test('pollChoices を \\n で結合', () => {
			const result = service.concatNoteContentsForKeyWordCheck({ pollChoices: ['a', 'b', 'c'] });
			expect(result).toBe('\na\nb\nc\n');
		});

		test('others を \\n で結合', () => {
			const result = service.concatNoteContentsForKeyWordCheck({ others: ['x', 'y'] });
			expect(result).toBe('\n\nx\ny');
		});

		test('全フィールド空 → 改行だけ', () => {
			expect(service.concatNoteContentsForKeyWordCheck({})).toBe('\n\n');
		});
	});

	describe('isKeyWordIncluded', () => {
		test('空 keyWords → false', () => {
			expect(service.isKeyWordIncluded('text', [])).toBe(false);
		});

		test('空 text → false', () => {
			expect(service.isKeyWordIncluded('', ['foo'])).toBe(false);
		});

		test('単純な AND マッチ (複数キーワードはスペース区切り)', () => {
			expect(service.isKeyWordIncluded('hello world', ['hello world'])).toBe(true);
		});

		test('一部だけ含む → false', () => {
			expect(service.isKeyWordIncluded('hello', ['hello world'])).toBe(false);
		});

		test('単一キーワードで含まれる', () => {
			expect(service.isKeyWordIncluded('this is foo bar', ['foo'])).toBe(true);
		});

		test('正規表現でマッチ', () => {
			expect(service.isKeyWordIncluded('hello123', ['/hello\\d+/'])).toBe(true);
		});

		test('正規表現でマッチしない', () => {
			expect(service.isKeyWordIncluded('hello', ['/\\d+/'])).toBe(false);
		});

		test('不正な正規表現は false (try-catch で握り潰す)', () => {
			expect(service.isKeyWordIncluded('hello', ['/[invalid/'])).toBe(false);
		});

		test('いずれかのキーワードに一致すれば true', () => {
			expect(service.isKeyWordIncluded('foo', ['bar', 'foo'])).toBe(true);
		});
	});

	describe('extractDbHost', () => {
		test('URL からホスト (punycode 化) を抽出', () => {
			expect(service.extractDbHost('https://例え.com/path')).toBe('xn--r8jz45g.com');
		});

		test('ポート付き URL からもホスト部分のみ', () => {
			expect(service.extractDbHost('https://example.com:8080/path')).toBe('example.com');
		});
	});

	describe('toPuny / toPunyNullable / punyHost', () => {
		test('toPuny: 大文字は小文字化 + punycode', () => {
			expect(service.toPuny('EXAMPLE.com')).toBe('example.com');
		});

		test('toPuny: IDN を punycode 化', () => {
			expect(service.toPuny('例え.jp')).toBe('xn--r8jz45g.jp');
		});

		test('toPunyNullable: null/undefined → null', () => {
			expect(service.toPunyNullable(null)).toBe(null);
			expect(service.toPunyNullable(undefined)).toBe(null);
		});

		test('toPunyNullable: 値があれば punycode 化', () => {
			expect(service.toPunyNullable('例え.jp')).toBe('xn--r8jz45g.jp');
		});

		test('punyHost: ポート付き URL のホスト + ポート', () => {
			expect(service.punyHost('https://例え.com:8443/')).toBe('xn--r8jz45g.com:8443');
		});

		test('punyHost: ポートなしなら :port つかない', () => {
			expect(service.punyHost('https://例え.com/')).toBe('xn--r8jz45g.com');
		});
	});

	describe('isFederationAllowedHost', () => {
		beforeEach(() => {
			vi.restoreAllMocks();
		});

		test('self host は常に許可', () => {
			const config = app.get<any>(DI.config);
			expect(service.isFederationAllowedHost(config.host)).toBe(true);
		});

		test('federation=none でリモートは拒否', () => {
			Object.assign(meta, { federation: 'none' as const, blockedHosts: [], federationHosts: [] });
			expect(service.isFederationAllowedHost('other.tld')).toBe(false);
		});

		test('federation=specified で allowed host は許可', () => {
			Object.assign(meta, { federation: 'specified' as const, federationHosts: ['allowed.com'], blockedHosts: [] });
			expect(service.isFederationAllowedHost('sub.allowed.com')).toBe(true);
		});

		test('federation=specified で 未指定 host は拒否', () => {
			Object.assign(meta, { federation: 'specified' as const, federationHosts: ['allowed.com'], blockedHosts: [] });
			expect(service.isFederationAllowedHost('other.tld')).toBe(false);
		});

		test('blockedHosts にマッチする host は拒否', () => {
			Object.assign(meta, { federation: 'all' as const, federationHosts: [], blockedHosts: ['evil.com'] });
			expect(service.isFederationAllowedHost('evil.com')).toBe(false);
		});

		test('通常のリモートは許可', () => {
			Object.assign(meta, { federation: 'all' as const, federationHosts: [], blockedHosts: [] });
			expect(service.isFederationAllowedHost('friendly.tld')).toBe(true);
		});
	});

	describe('isFederationAllowedUri', () => {
		test('許可 URI → true', () => {
			Object.assign(meta, { federation: 'all' as const, federationHosts: [], blockedHosts: [] });
			expect(service.isFederationAllowedUri('https://friendly.tld/users/abc')).toBe(true);
		});

		test('ブロック URI → false', () => {
			Object.assign(meta, { federation: 'all' as const, federationHosts: [], blockedHosts: ['evil.com'] });
			expect(service.isFederationAllowedUri('https://evil.com/users/abc')).toBe(false);
		});
	});

	describe('isDeliverSuspendedSoftware', () => {
		beforeEach(() => {
			vi.restoreAllMocks();
		});

		test('softwareName null → undefined', () => {
			Object.assign(meta, { deliverSuspendedSoftware: [] });
			expect(service.isDeliverSuspendedSoftware({ softwareName: null as any, softwareVersion: '1.0.0' })).toBeUndefined();
		});

		test('softwareVersion null + versionRange="*" → 一致', () => {
			Object.assign(meta, { deliverSuspendedSoftware: [{ software: 'mastodon', versionRange: '*' }] });
			expect(service.isDeliverSuspendedSoftware({ softwareName: 'mastodon' as any, softwareVersion: null as any })).toEqual({ software: 'mastodon', versionRange: '*' });
		});

		test('softwareVersion null + versionRange!="*" → undefined', () => {
			Object.assign(meta, { deliverSuspendedSoftware: [{ software: 'mastodon', versionRange: '>=1.0.0' }] });
			expect(service.isDeliverSuspendedSoftware({ softwareName: 'mastodon' as any, softwareVersion: null as any })).toBeUndefined();
		});

		test('semver マッチ → エントリ返却', () => {
			Object.assign(meta, { deliverSuspendedSoftware: [{ software: 'mastodon', versionRange: '<3.0.0' }] });
			expect(service.isDeliverSuspendedSoftware({ softwareName: 'mastodon' as any, softwareVersion: '2.5.0' })).toEqual({ software: 'mastodon', versionRange: '<3.0.0' });
		});

		test('semver 不一致 → undefined', () => {
			Object.assign(meta, { deliverSuspendedSoftware: [{ software: 'mastodon', versionRange: '<3.0.0' }] });
			expect(service.isDeliverSuspendedSoftware({ softwareName: 'mastodon' as any, softwareVersion: '3.5.0' })).toBeUndefined();
		});

		test('prerelease も含めて semver 判定', () => {
			Object.assign(meta, { deliverSuspendedSoftware: [{ software: 'mastodon', versionRange: '>=2.0.0' }] });
			expect(service.isDeliverSuspendedSoftware({ softwareName: 'mastodon' as any, softwareVersion: '3.0.0-beta1' })).toEqual({ software: 'mastodon', versionRange: '>=2.0.0' });
		});
	});
});
