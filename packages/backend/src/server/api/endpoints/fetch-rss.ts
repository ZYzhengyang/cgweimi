/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as dns from 'node:dns/promises';
import Parser from 'rss-parser';
import ipaddr from 'ipaddr.js';
import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { HttpRequestService } from '@/core/HttpRequestService.js';

const rssParser = new Parser();

/**
 * SSRF 防护: 拒绝指向内网/loopback/link-local 地址的 URL。
 *
 * HttpRequestService 内部已对 socket 实际连接的远端地址做
 * private IP 阻断（仅在 NODE_ENV === 'production' 生效），
 * 端点层应同时做显式校验. 本函数通过 dns.lookup 在请求时
 * 解析 hostname 并验证每个 IP 都落在 unicast 范围, 覆盖:
 *  - 非 production 环境下绕过 socket 层拦截
 *  - DNS rebinding 等 TOCTOU 场景下 hostname 通过校验但
 *    实际解析到内网 IP 的攻击 (注意: dns.lookup 与随后
 *    fetch 之间的窗口仍可能被 rebinding 攻击利用, 因此
 *    完整的 SSRF 防护还需要在 HttpRequestService 侧禁用
 *    自动 follow 30x 跳转 — 留待项目级修复)
 *  - 攻击者传入 file:// / gopher:// 等非 HTTP(S) 协议
 *  - IPv6 映射 (::ffff:127.0.0.1) 等绕过面
 */
async function isAllowedPublicUrl(rawUrl: string): Promise<boolean> {
	let url: URL;
	try {
		url = new URL(rawUrl);
	} catch {
		return false;
	}

	// 协议白名单: 仅允许 http(s)
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		return false;
	}

	const hostname = url.hostname;
	if (hostname.length === 0) {
		return false;
	}

	// 显式拒绝文本 localhost (大小写不敏感, 含前后空白)
	if (hostname.trim().toLowerCase() === 'localhost') {
		return false;
	}

	// 拒绝含控制字符 / null 字节的 hostname (smuggle 攻击)
	// eslint-disable-next-line no-control-regex
	if (/[\x00-\x1f\x7f]/.test(hostname)) {
		return false;
	}

	// DNS 解析: 同时检查 IPv4 (family: 4) 与 IPv6 (family: 6),
	// 取全部解析结果, 任一落在非 unicast 即拒绝.
	const resolvedIps: { address: string; }[] = [];
	try {
		const v4 = await dns.lookup(hostname, { all: true, verbatim: true, family: 4 });
		for (const e of v4) resolvedIps.push(e);
	} catch { /* host 无 A 记录不致命 */ }
	try {
		const v6 = await dns.lookup(hostname, { all: true, verbatim: true, family: 6 });
		for (const e of v6) resolvedIps.push(e);
	} catch { /* host 无 AAAA 记录不致命 */ }

	if (resolvedIps.length === 0) {
		return false;
	}

	for (const { address } of resolvedIps) {
		try {
			if (!ipaddr.isValid(address)) {
				return false;
			}
			// 仅允许 unicast (公网); 拒绝 loopback / private / linkLocal /
			// unspecified / multicast / carrierNatNat64 / uniqueLocal 等
			if (ipaddr.parse(address).range() !== 'unicast') {
				return false;
			}
		} catch {
			return false;
		}
	}

	return true;
}

export const meta = {
	tags: ['meta'],

	requireCredential: false,
	allowGet: true,
	cacheSec: 60 * 3,

	res: {
		type: 'object',
		properties: {
			image: {
				type: 'object',
				optional: true,
				properties: {
					link: {
						type: 'string',
						optional: true,
					},
					url: {
						type: 'string',
						optional: false,
					},
					title: {
						type: 'string',
						optional: true,
					},
				},
			},
			paginationLinks: {
				type: 'object',
				optional: true,
				properties: {
					self: {
						type: 'string',
						optional: true,
					},
					first: {
						type: 'string',
						optional: true,
					},
					next: {
						type: 'string',
						optional: true,
					},
					last: {
						type: 'string',
						optional: true,
					},
					prev: {
						type: 'string',
						optional: true,
					},
				},
			},
			link: {
				type: 'string',
				optional: true,
			},
			title: {
				type: 'string',
				optional: true,
			},
			items: {
				type: 'array',
				optional: false,
				items: {
					type: 'object',
					properties: {
						link: {
							type: 'string',
							optional: true,
						},
						guid: {
							type: 'string',
							optional: true,
						},
						title: {
							type: 'string',
							optional: true,
						},
						pubDate: {
							type: 'string',
							optional: true,
						},
						creator: {
							type: 'string',
							optional: true,
						},
						summary: {
							type: 'string',
							optional: true,
						},
						content: {
							type: 'string',
							optional: true,
						},
						isoDate: {
							type: 'string',
							optional: true,
						},
						categories: {
							type: 'array',
							optional: true,
							items: {
								type: 'string',
							},
						},
						contentSnippet: {
							type: 'string',
							optional: true,
						},
						enclosure: {
							type: 'object',
							optional: true,
							properties: {
								url: {
									type: 'string',
									optional: false,
								},
								length: {
									type: 'number',
									optional: true,
								},
								type: {
									type: 'string',
									optional: true,
								},
							},
						},
					},
				},
			},
			feedUrl: {
				type: 'string',
				optional: true,
			},
			description: {
				type: 'string',
				optional: true,
			},
			itunes: {
				type: 'object',
				optional: true,
				additionalProperties: true,
				properties: {
					image: {
						type: 'string',
						optional: true,
					},
					owner: {
						type: 'object',
						optional: true,
						properties: {
							name: {
								type: 'string',
								optional: true,
							},
							email: {
								type: 'string',
								optional: true,
							},
						},
					},
					author: {
						type: 'string',
						optional: true,
					},
					summary: {
						type: 'string',
						optional: true,
					},
					explicit: {
						type: 'string',
						optional: true,
					},
					categories: {
						type: 'array',
						optional: true,
						items: {
							type: 'string',
						},
					},
					keywords: {
						type: 'array',
						optional: true,
						items: {
							type: 'string',
						},
					},
				},
			},
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		url: { type: 'string' },
	},
	required: ['url'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		private httpRequestService: HttpRequestService,
	) {
		super(meta, paramDef, async (ps, me) => {
			// SSRF 防护: 拒绝 localhost / 内网 IP / 非 http(s) 协议
			if (!await isAllowedPublicUrl(ps.url)) {
				throw new Error('Invalid URL');
			}

			const res = await this.httpRequestService.send(ps.url, {
				method: 'GET',
				headers: {
					Accept: 'application/rss+xml, */*',
				},
				timeout: 5000,
				size: 1024 * 64, // 64 KiB 上限, 防止大体积响应耗尽内存
			}, {
				throwErrorWhenResponseNotOk: true,
			});

			const text = await res.text();

			return rssParser.parseString(text);
		});
	}
}
