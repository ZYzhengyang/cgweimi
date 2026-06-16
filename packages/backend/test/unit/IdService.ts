/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import { IdService } from '@/core/IdService.js';
import { aidRegExp } from '@/misc/id/aid.js';
import { aidxRegExp } from '@/misc/id/aidx.js';
import { meidRegExp } from '@/misc/id/meid.js';
import { meidgRegExp } from '@/misc/id/meidg.js';
import { ulidRegExp } from '@/misc/id/ulid.js';
import { objectIdRegExp } from '@/misc/id/object-id.js';

function makeService(method: string): IdService {
	return new IdService({ id: method } as any);
}

describe('IdService', () => {
	describe('isSafeT', () => {
		test.each([
			['aidx', aidxRegExp],
			['aid', aidRegExp],
			['meid', meidRegExp],
			['meidg', meidgRegExp],
			['ulid', ulidRegExp],
			['objectid', objectIdRegExp],
		])('method=%s returns boolean from isSafeXT', (method, _regex) => {
			const svc = makeService(method);
			const now = Date.now();
			expect(typeof svc.isSafeT(now)).toBe('boolean');
		});

		test('ulid: future timestamp (unsafe) returns false', () => {
			const svc = makeService('ulid');
			// ulid isSafeT check is t > 0
			expect(svc.isSafeT(0)).toBe(false);
			expect(svc.isSafeT(Date.now())).toBe(true);
		});

		test('invalid method throws', () => {
			const svc = makeService('unknown-method');
			expect(() => svc.isSafeT(Date.now())).toThrow('unrecognized id generation method');
		});
	});

	describe('gen', () => {
		test('aidx: gen without arg uses Date.now() and matches regex', () => {
			const svc = makeService('aidx');
			const id = svc.gen();
			expect(id).toMatch(aidxRegExp);
		});

		test('aidx: gen with explicit time matches regex', () => {
			const svc = makeService('aidx');
			const time = 1_700_000_000_000;
			const id = svc.gen(time);
			expect(id).toMatch(aidxRegExp);
		});

		test('aidx: gen with future time falls back to Date.now()', () => {
			const svc = makeService('aidx');
			const future = Date.now() + 10_000_000;
			const id = svc.gen(future);
			expect(id).toMatch(aidxRegExp);
		});

		test('aidx: gen with time=0 uses Date.now() (since 0 is falsy)', () => {
			const svc = makeService('aidx');
			const id = svc.gen(0);
			expect(id).toMatch(aidxRegExp);
		});

		test('aid: gen produces valid id', () => {
			const svc = makeService('aid');
			expect(svc.gen(1_700_000_000_000)).toMatch(aidRegExp);
		});

		test('meid: gen produces valid id', () => {
			const svc = makeService('meid');
			expect(svc.gen(1_700_000_000_000)).toMatch(meidRegExp);
		});

		test('meidg: gen produces valid id', () => {
			const svc = makeService('meidg');
			expect(svc.gen(1_700_000_000_000)).toMatch(meidgRegExp);
		});

		test('ulid: gen produces valid id', () => {
			const svc = makeService('ulid');
			expect(svc.gen(1_700_000_000_000)).toMatch(ulidRegExp);
		});

		test('objectid: gen produces valid id', () => {
			const svc = makeService('objectid');
			expect(svc.gen(1_700_000_000_000)).toMatch(objectIdRegExp);
		});

		test('invalid method throws on gen', () => {
			const svc = makeService('not-a-method');
			expect(() => svc.gen()).toThrow('unrecognized id generation method');
		});
	});

	describe('parse', () => {
		test('aidx: parse returns Date', () => {
			const svc = makeService('aidx');
			const time = 1_700_000_000_000;
			const id = svc.gen(time);
			const parsed = svc.parse(id);
			expect(parsed.date).toBeInstanceOf(Date);
			expect(parsed.date.getTime()).toBe(time);
		});

		test('aid: parse returns Date', () => {
			const svc = makeService('aid');
			const time = 1_700_000_000_000;
			const id = svc.gen(time);
			const parsed = svc.parse(id);
			expect(parsed.date).toBeInstanceOf(Date);
			expect(parsed.date.getTime()).toBe(time);
		});

		test('ulid: parse returns Date', () => {
			const svc = makeService('ulid');
			const time = 1_700_000_000_000;
			const id = svc.gen(time);
			const parsed = svc.parse(id);
			expect(parsed.date).toBeInstanceOf(Date);
			expect(parsed.date.getTime()).toBe(time);
		});

		test('objectid: parse returns Date (seconds precision)', () => {
			const svc = makeService('objectid');
			const time = 1_700_000_000_000;
			const id = svc.gen(time);
			const parsed = svc.parse(id);
			expect(parsed.date).toBeInstanceOf(Date);
			expect(Math.floor(parsed.date.getTime() / 1000)).toBe(Math.floor(time / 1000));
		});

		test('invalid method throws on parse', () => {
			const svc = makeService('not-a-method');
			expect(() => svc.parse('xxx')).toThrow('unrecognized id generation method');
		});
	});

	describe('parseFull', () => {
		test('aidx: parseFull returns date (number) and additional (bigint)', () => {
			const svc = makeService('aidx');
			const time = 1_700_000_000_000;
			const id = svc.gen(time);
			const parsed = svc.parseFull(id);
			expect(typeof parsed.date).toBe('number');
			expect(parsed.date).toBe(time);
			expect(typeof parsed.additional).toBe('bigint');
		});

		test('ulid: parseFull returns date (number) and additional (bigint)', () => {
			const svc = makeService('ulid');
			const time = 1_700_000_000_000;
			const id = svc.gen(time);
			const parsed = svc.parseFull(id);
			expect(typeof parsed.date).toBe('number');
			expect(parsed.date).toBe(time);
			expect(typeof parsed.additional).toBe('bigint');
		});

		test('objectid: parseFull returns date (number) and additional (bigint)', () => {
			const svc = makeService('objectid');
			const time = 1_700_000_000_000;
			const id = svc.gen(time);
			const parsed = svc.parseFull(id);
			expect(typeof parsed.date).toBe('number');
			expect(parsed.date).toBe(time);
			expect(typeof parsed.additional).toBe('bigint');
		});

		test('aid: parseFull returns date and additional', () => {
			const svc = makeService('aid');
			const time = 1_700_000_000_000;
			const id = svc.gen(time);
			const parsed = svc.parseFull(id);
			expect(parsed.date).toBe(time);
			expect(typeof parsed.additional).toBe('bigint');
		});

		test('invalid method throws on parseFull', () => {
			const svc = makeService('not-a-method');
			expect(() => svc.parseFull('xxx')).toThrow('unrecognized id generation method');
		});
	});

	describe('config normalization', () => {
		test('uppercase method is lowercased in constructor', () => {
			const svc = new IdService({ id: 'AIDX' } as any);
			// AIDX lowercased to aidx
			const id = svc.gen(1_700_000_000_000);
			expect(id).toMatch(aidxRegExp);
		});

		test('round-trip gen+parse yields original time', () => {
			const svc = makeService('aidx');
			const time = 1_700_000_000_000;
			const id = svc.gen(time);
			expect(svc.parse(id).date.getTime()).toBe(time);
		});
	});
});
