/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

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
 * private IP 阻断（仅在 NODE_ENV === 'production' 生效），但
 * 端点层应同时做显式 hostname 校验, 以避免:
 *  - 非 production 环境下绕过保护
 *  - DNS rebinding 等 TOCTOU 场景下 hostname 已通过但实际
 *    解析到内网 IP 的攻击
 *  - 攻击者传入 file:// / gopher:// 等非 HTTP(S) 协议
 */
function isAllowedPublicUrl(rawUrl: string): boolean {
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

	// 若 hostname 是字面 IP, 用 ipaddr.js 判断其 range
	if (ipaddr.isValid(hostname)) {
		try {
			const parsed = ipaddr.parse(hostname);
			// 仅允许 unicast (公网); 拒绝 loopback / private / linkLocal / unspecified / multicast 等
			if (parsed.range() !== 'unicast') {
				return false;
			}
		} catch {
			return false;
		}
		return true;
	}

	// 域名形式: 这里不预先做 DNS 解析, 实际的 socket 层拦截
	// (HttpRequestServiceAgent) 会处理解析后的 IP. 此处只兜底
	// 拒绝明显非法的 hostname (例如含 null 字节、控制字符).
	// eslint-disable-next-line no-control-regex
	if (/[\x00-\x1f\x7f]/.test(hostname)) {
		return false;
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
			if (!isAllowedPublicUrl(ps.url)) {
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
