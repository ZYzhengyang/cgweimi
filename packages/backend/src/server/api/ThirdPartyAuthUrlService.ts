/*
 * CG微米 - 获取第三方登录URL的端点
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import { bindThis } from '@/decorators.js';
import type { Config } from '@/config.js';
import type { FastifyReply, FastifyRequest } from 'fastify';

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
		const appId = process.env.WECHAT_APP_ID || 'wxe5afebe19d7dbf50';
		const redirectUri = encodeURIComponent(this.config.url + '/api/auth/wechat/callback');
		const url = `https://open.weixin.qq.com/connect/qrconnect?appid=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_login&state=wechat#wechat_redirect`;

		reply.code(200);
		return { url };
	}

	@bindThis
	public async getQQAuthUrl(
		_request: FastifyRequest,
		reply: FastifyReply,
	) {
		const appId = process.env.QQ_APP_ID || '102082357';
		const redirectUri = encodeURIComponent(this.config.url + '/api/auth/qq/callback');
		const url = `https://graph.qq.com/oauth2.0/authorize?response_type=code&client_id=${appId}&redirect_uri=${redirectUri}&state=qq`;

		reply.code(200);
		return { url };
	}

	@bindThis
	public async getThirdPartyConfig(
		_request: FastifyRequest,
		reply: FastifyReply,
	) {
		const wechatAppId = process.env.WECHAT_APP_ID || 'wxe5afebe19d7dbf50';
		const qqAppId = process.env.QQ_APP_ID || '102082357';
		
		reply.code(200);
		return {
			wechat: {
				enabled: !!wechatAppId,
				appId: wechatAppId,
			},
			qq: {
				enabled: !!qqAppId,
				appId: qqAppId,
			},
			sms: {
				enabled: true,
			},
		};
	}
}
