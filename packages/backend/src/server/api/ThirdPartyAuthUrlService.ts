/*
 * CG微米 - 获取第三方登录URL的端点
 */

import { Inject, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { DI } from '@/di-symbols.js';
import { bindThis } from '@/decorators.js';
import type { Config } from '@/config.js';
import type { FastifyReply, FastifyRequest } from 'fastify';

// State store with TTL for CSRF protection
const oauthStates: Map<string, { provider: string; expiresAt: number }> = new Map();

// Clean expired states periodically
setInterval(() => {
	const now = Date.now();
	for (const [key, value] of oauthStates) {
		if (now > value.expiresAt) oauthStates.delete(key);
	}
}, 60_000);

// Export for validation in ThirdPartyAuthService
export function validateAndConsumeOAuthState(state: string, provider: string): boolean {
	const entry = oauthStates.get(state);
	if (!entry) return false;
	oauthStates.delete(state);
	if (Date.now() > entry.expiresAt) return false;
	if (entry.provider !== provider) return false;
	return true;
}

@Injectable()
export class ThirdPartyAuthUrlService {
	constructor(
		@Inject(DI.config)
		private config: Config,
	) {
	}

	@bindThis
	public async getWechatAuthUrl(
		_request: FastifyRequest,
		reply: FastifyReply,
	) {
		// 强制要求环境变量配置,禁止硬编码 fallback 以防止密钥泄漏
		const appId = process.env.WECHAT_APP_ID;
		if (!appId) {
			reply.code(503);
			return { error: '微信登录未配置' };
		}
		const redirectUri = encodeURIComponent(this.config.url + '/api/auth/wechat/callback');
		const state = randomBytes(32).toString('hex');
		oauthStates.set(state, { provider: 'wechat', expiresAt: Date.now() + 5 * 60 * 1000 });
		const url = `https://open.weixin.qq.com/connect/qrconnect?appid=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`;

		reply.code(200);
		return { url };
	}

	@bindThis
	public async getQQAuthUrl(
		_request: FastifyRequest,
		reply: FastifyReply,
	) {
		// 强制要求环境变量配置,禁止硬编码 fallback 以防止密钥泄漏
		const appId = process.env.QQ_APP_ID;
		if (!appId) {
			reply.code(503);
			return { error: 'QQ登录未配置' };
		}
		const redirectUri = encodeURIComponent(this.config.url + '/api/auth/qq/callback');
		const state = randomBytes(32).toString('hex');
		oauthStates.set(state, { provider: 'qq', expiresAt: Date.now() + 5 * 60 * 1000 });
		const url = `https://graph.qq.com/oauth2.0/authorize?response_type=code&client_id=${appId}&redirect_uri=${redirectUri}&state=${state}`;

		reply.code(200);
		return { url };
	}

	@bindThis
	public async getThirdPartyConfig(
		_request: FastifyRequest,
		reply: FastifyReply,
	) {
		// 强制要求环境变量配置,禁止硬编码 fallback 以防止密钥泄漏
		const wechatAppId = process.env.WECHAT_APP_ID;
		const qqAppId = process.env.QQ_APP_ID;

		reply.code(200);
		return {
			wechat: {
				enabled: !!wechatAppId,
				appId: wechatAppId ?? null,
			},
			qq: {
				enabled: !!qqAppId,
				appId: qqAppId ?? null,
			},
			sms: {
				enabled: true,
			},
		};
	}
}
