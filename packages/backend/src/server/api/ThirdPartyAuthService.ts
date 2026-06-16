/*
 * CG微米 - 第三方登录服务（微信/QQ/手机号）
 * 修复：token生成、用户创建、OAuth回调
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { UsersRepository, UserProfilesRepository, SigninsRepository } from '@/models/_.js';
import type { MiMeta } from '@/models/Meta.js';
import type { MiLocalUser } from '@/models/User.js';
import { IdService } from '@/core/IdService.js';
import { SigninService } from '@/server/api/SigninService.js';
import { SignupService } from '@/core/SignupService.js';
import { GlobalEventService } from '@/core/GlobalEventService.js';
import { SigninEntityService } from '@/core/entities/SigninEntityService.js';
import { NotificationService } from '@/core/NotificationService.js';
import { bindThis } from '@/decorators.js';
import type { Config } from '@/config.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import https from 'node:https';
import { randomInt } from 'node:crypto';
import { validateAndConsumeOAuthState } from './ThirdPartyAuthUrlService.js';

// 验证码存储（内存，生产可换 Redis）
const MAX_SMS_CODES = 10000;
const SMS_CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const smsCodes: Map<string, { code: string; expiresAt: number; lastSent: number }> = new Map();

/** Remove expired entries from the smsCodes Map */
function cleanupExpiredSmsCodes(): void {
	const now = Date.now();
	for (const [phone, entry] of smsCodes) {
		if (now > entry.expiresAt) {
			smsCodes.delete(phone);
		}
	}
}

// Periodic cleanup of expired SMS codes
setInterval(cleanupExpiredSmsCodes, SMS_CLEANUP_INTERVAL_MS);

@Injectable()
export class ThirdPartyAuthService {

	constructor(
		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		@Inject(DI.userProfilesRepository)
		private userProfilesRepository: UserProfilesRepository,

		@Inject(DI.signinsRepository)
		private signinsRepository: SigninsRepository,

		@Inject(DI.meta)
		private meta: MiMeta,

		@Inject(DI.config)
		private config: Config,

		private idService: IdService,
		private signinService: SigninService,
		private signupService: SignupService,
		private globalEventService: GlobalEventService,
		private signinEntityService: SigninEntityService,
		private notificationService: NotificationService,
	) {}

	/**
	 * 记录登录事件（不发送响应，留给调用方处理）
	 */
	private recordSignin(request: FastifyRequest, user: MiLocalUser): void {
		setImmediate(async () => {
			try {
				this.notificationService.createNotification(user.id, 'login', {});
				const record = await this.signinsRepository.insertOne({
					id: this.idService.gen(),
					userId: user.id,
					ip: request.ip,
					// request.headers は fastify の IncomingHttpHeaders 型、Signin.headers は Record<string, any> 型で
					// jsonb に保存するため、両者の互換性のための cast
					headers: request.headers as Record<string, any>,
					success: true,
				});
				this.globalEventService.publishMainStream(user.id, 'signin', await this.signinEntityService.pack(record));
			} catch (e) {
				console.error('[OAuth] recordSignin error:', e);
			}
		});
	}

	/**
	 * 生成有效的 Misskey 用户名（只允许 \w{1,20} = 字母数字下划线）
	 */
	private generateOAuthUsername(nickname: string | undefined, prefix: string): string {
		if (nickname) {
			// 移除非 ASCII 字母数字下划线字符
			let cleaned = nickname.replace(/[^\w]/g, '').toLowerCase();
			// 确保以字母开头
			if (cleaned.length > 0 && /^\d/.test(cleaned)) {
				cleaned = prefix + cleaned;
			}
			if (cleaned.length >= 3 && cleaned.length <= 18) {
				return cleaned;
			}
		}
		// fallback: 前缀 + 随机字符
		const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
		let result = prefix;
		for (let i = 0; i < 6; i++) {
			result += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return result;
	}

	/**
	 * 安全创建 OAuth 用户，处理用户名冲突
	 * 返回 { userId, token }
	 */
	private async createOAuthUser(
		nickname: string | undefined,
		prefix: string,
		avatarUrl: string | null,
	): Promise<{ userId: string; token: string }> {
		let username = this.generateOAuthUsername(nickname, prefix);

		// 尝试创建，用户名冲突时重试
		for (let attempt = 0; attempt < 5; attempt++) {
			try {
				const result = await this.signupService.signup({
					username,
					password: null,
					host: null,
					ignorePreservedUsernames: true,
				});
				return { userId: result.account.id, token: result.secret };
			} catch (e) {
				const message = e instanceof Error ? e.message : String(e);
				if (message === 'DUPLICATED_USERNAME' || message === 'USED_USERNAME') {
					// 用户名冲突，加随机后缀重试
					const suffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
					username = prefix + suffix;
					continue;
				}
				throw e;
			}
		}
		throw new Error('Failed to create user after 5 attempts');
	}

	/**
	 * Escape a string for safe insertion into a JS string literal within HTML
	 */
	private escapeForJsString(str: string): string {
		return str
			.replace(/\\/g, '\\\\')
			.replace(/'/g, "\\'")
			.replace(/</g, '\\x3c')
			.replace(/>/g, '\\x3e')
			.replace(/&/g, '\\x26')
			.replace(/"/g, '\\"');
	}

	/**
	 * 生成 OAuth 回调 HTML 页面，通过 postMessage 将 token 传回父窗口
	 */
	private getOAuthCallbackHtml(token: string, userId: string): string {
		const safeToken = this.escapeForJsString(token);
		const safeUserId = this.escapeForJsString(userId);
		const safeOrigin = this.escapeForJsString(this.config.url);
		return `<!DOCTYPE html>
<html>
<head><title>登录中...</title></head>
<body>
<p style="text-align:center;font-family:sans-serif;margin-top:40%;">正在登录，请稍候...</p>
<script>
try {
  if (window.opener) {
    window.opener.postMessage({ success: true, token: '${safeToken}', userId: '${safeUserId}' }, '${safeOrigin}');
  }
} catch(e) { console.error('[OAuth callback] postMessage failed:', e); }
setTimeout(function() { window.close(); }, 500);
</script>
</body>
</html>`;
	}

	/**
	 * 生成 OAuth 错误 HTML 页面
	 */
	private getOAuthErrorHtml(error: string): string {
		const safeError = this.escapeForJsString(error);
		const safeOrigin = this.escapeForJsString(this.config.url);
		return `<!DOCTYPE html>
<html>
<head><title>登录失败</title></head>
<body>
<p style="text-align:center;font-family:sans-serif;margin-top:40%;">登录失败: ${safeError}</p>
<script>
try {
  if (window.opener) {
    window.opener.postMessage({ success: false, error: '${safeError}' }, '${safeOrigin}');
  }
} catch(e) { console.error('[OAuth callback] postMessage failed:', e); }
setTimeout(function() { window.close(); }, 2000);
</script>
</body>
</html>`;
	}

	@bindThis
	public async wechatLogin(request: FastifyRequest, reply: FastifyReply) {
		const { code, state } = request.query as { code?: string; state?: string };
		if (!code) {
			return reply.type('text/html').send(this.getOAuthErrorHtml('缺少授权码'));
		}
		if (!state || !validateAndConsumeOAuthState(state, 'wechat')) {
			return reply.type('text/html').send(this.getOAuthErrorHtml('无效的状态参数，请重试'));
		}

		// 强制要求环境变量配置，禁止硬编码 fallback 以防止密钥泄漏
		const appId = process.env.WECHAT_APP_ID;
		const appSecret = process.env.WECHAT_APP_SECRET;
		if (!appId || !appSecret) {
			console.error('[WeChat OAuth] WECHAT_APP_ID / WECHAT_APP_SECRET 未配置，微信登录已禁用');
			return reply.type('text/html').send(this.getOAuthErrorHtml('微信登录未配置，请联系管理员'));
		}

		try {
			// 1. 用 code 换 access_token
			const tokenUrl = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${appSecret}&code=${code}&grant_type=authorization_code`;
			const tokenResponse = await fetch(tokenUrl, { signal: AbortSignal.timeout(10000) });
			const tokenData = await tokenResponse.json() as { access_token?: string; openid?: string; errcode?: number; errmsg?: string };

			if (!tokenData.access_token || tokenData.errcode) {
				console.error('[WeChat OAuth] Token error:', tokenData);
				return reply.type('text/html').send(this.getOAuthErrorHtml(tokenData.errmsg || '获取access_token失败'));
			}

		// 2. 获取用户信息
			const userInfoUrl = `https://api.weixin.qq.com/sns/userinfo?access_token=${tokenData.access_token}&openid=${tokenData.openid}&lang=zh_CN`;
			const userInfoResponse = await fetch(userInfoUrl, { signal: AbortSignal.timeout(10000) });
			const userInfo = await userInfoResponse.json() as { openid?: string; nickname?: string; headimgurl?: string; errcode?: number; errmsg?: string };

			if (userInfo.errcode) {
				console.error('[WeChat OAuth] UserInfo error:', userInfo);
				return reply.type('text/html').send(this.getOAuthErrorHtml(userInfo.errmsg || '获取用户信息失败'));
			}

			// 3. 查找已有用户
			let user = await this.usersRepository.findOneBy({ wechatOpenId: userInfo.openid }) as MiLocalUser | null;

			if (user) {
				// 已有用户，记录登录事件，返回 HTML
				this.recordSignin(request, user);
				return reply.type('text/html').send(this.getOAuthCallbackHtml(user.token!, user.id));
			}

			// 4. 创建新用户（token 由 SignupService 生成）
			try {
				const { userId, token } = await this.createOAuthUser(
					userInfo.nickname,
					'wx_',
					userInfo.headimgurl || null,
				);

				// 写入 wechatOpenId
				await this.usersRepository.update({ id: userId }, { wechatOpenId: userInfo.openid });

				return reply.type('text/html').send(this.getOAuthCallbackHtml(token, userId));
			} catch (createError) {
				const msg = createError instanceof Error ? createError.message : String(createError);
				console.error('[WeChat OAuth] Create user error:', createError);
				return reply.type('text/html').send(this.getOAuthErrorHtml('创建用户失败: ' + msg));
			}

		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			console.error('[WeChat OAuth] Error:', error);
			return reply.type('text/html').send(this.getOAuthErrorHtml(msg || '微信登录失败'));
		}
	}

	@bindThis
	public async qqLogin(request: FastifyRequest, reply: FastifyReply) {
		const { code, state } = request.query as { code?: string; state?: string };
		if (!code) {
			return reply.type('text/html').send(this.getOAuthErrorHtml('缺少授权码'));
		}
		if (!state || !validateAndConsumeOAuthState(state, 'qq')) {
			return reply.type('text/html').send(this.getOAuthErrorHtml('无效的状态参数，请重试'));
		}

		// 强制要求环境变量配置,禁止硬编码 fallback 以防止密钥泄漏
		const appId = process.env.QQ_APP_ID;
		const appKey = process.env.QQ_APP_KEY;
		if (!appId || !appKey) {
			console.error('[QQ OAuth] QQ_APP_ID / QQ_APP_KEY 未配置,QQ登录已禁用');
			return reply.type('text/html').send(this.getOAuthErrorHtml('QQ登录未配置,请联系管理员'));
		}

		try {
			// 1. 用 code 换 access_token
			const redirectUri = process.env.QQ_REDIRECT_URI || (this.config.url + '/api/auth/qq/callback');
			const tokenUrl = `https://graph.qq.com/oauth2.0/token?grant_type=authorization_code&client_id=${appId}&client_secret=${appKey}&code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}&fmt=json`;
			const tokenResponse = await fetch(tokenUrl);
			const tokenText = await tokenResponse.text();

			// 解析 access_token（支持 JSON 和 JSONP 格式）
			let accessToken: string | null = null;
			try {
				const jsonData = JSON.parse(tokenText);
				accessToken = jsonData.access_token;
			} catch {
				const jsonpMatch = tokenText.match(/callback\s*\(\s*({.*?})\s*\)/);
				if (jsonpMatch) {
					const jsonData = JSON.parse(jsonpMatch[1]);
					accessToken = jsonData.access_token;
				}
			}

			if (!accessToken) {
				return reply.type('text/html').send(this.getOAuthErrorHtml('获取access_token失败'));
			}

			// 2. 获取 OpenID
			const openIdUrl = `https://graph.qq.com/oauth2.0/me?access_token=${accessToken}&fmt=json`;
			const openIdResponse = await fetch(openIdUrl);
			let openIdText = await openIdResponse.text();

			let openIdData: { openid?: string };
			const openIdJsonpMatch = openIdText.match(/callback\s*\(\s*({.*?})\s*\)/);
			if (openIdJsonpMatch) {
				openIdData = JSON.parse(openIdJsonpMatch[1]);
			} else {
				openIdData = JSON.parse(openIdText);
			}

			if (!openIdData.openid) {
				return reply.type('text/html').send(this.getOAuthErrorHtml('获取OpenID失败'));
			}

			// 3. 获取用户信息
			const userInfoUrl = `https://graph.qq.com/user/get_user_info?access_token=${accessToken}&oauth_consumer_key=${appId}&openid=${openIdData.openid}`;
			const userInfoResponse = await fetch(userInfoUrl);
			const userInfo = await userInfoResponse.json() as { nickname?: string; figureurl_qq_1?: string; figureurl_qq_2?: string };

			// 4. 查找已有用户
			let user = await this.usersRepository.findOneBy({ qqOpenId: openIdData.openid }) as MiLocalUser | null;

			if (user) {
				// 已有用户，记录登录事件，返回 HTML
				this.recordSignin(request, user);
				return reply.type('text/html').send(this.getOAuthCallbackHtml(user.token!, user.id));
			}

			// 5. 创建新用户
			try {
				const { userId, token } = await this.createOAuthUser(
					userInfo.nickname,
					'qq_',
					userInfo.figureurl_qq_2 || userInfo.figureurl_qq_1 || null,
				);

				// 写入 qqOpenId
				await this.usersRepository.update({ id: userId }, { qqOpenId: openIdData.openid });

				return reply.type('text/html').send(this.getOAuthCallbackHtml(token, userId));
			} catch (createError) {
				const msg = createError instanceof Error ? createError.message : String(createError);
				console.error('[QQ OAuth] Create user error:', createError);
				return reply.type('text/html').send(this.getOAuthErrorHtml('创建用户失败: ' + msg));
			}

		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			console.error('[QQ OAuth] Error:', error);
			return reply.type('text/html').send(this.getOAuthErrorHtml(msg || 'QQ登录失败'));
		}
	}

	@bindThis
	public async phoneLogin(request: FastifyRequest, reply: FastifyReply) {
		const { phone, code } = request.body as { phone?: string; code?: string };
		if (!phone || !code) {
			return reply.code(400).send({ error: 'Missing phone or code' });
		}

		// 验证码校验
		const entry = smsCodes.get(phone);
		if (!entry) {
			return reply.code(400).send({ error: '请先获取验证码' });
		}
		if (Date.now() > entry.expiresAt) {
			smsCodes.delete(phone);
			return reply.code(400).send({ error: '验证码已过期，请重新获取' });
		}
		if (entry.code !== code) {
			return reply.code(400).send({ error: '验证码错误' });
		}

		// 验证通过，删除验证码
		smsCodes.delete(phone);

		try {
			// 查找已有用户
			const profile = await this.userProfilesRepository.findOneBy({ phone });
			let user: MiLocalUser | null = null;

			if (profile) {
				user = await this.usersRepository.findOneBy({ id: profile.userId }) as MiLocalUser | null;
			}

			if (user) {
				// 已有用户，直接登录（JSON 响应，因为不是 popup）
				return this.signinService.signin(request, reply, user);
			}

			// 创建新用户
			const { userId, token } = await this.createOAuthUser(
				undefined,
				'ph_',
				null,
			);

			// 写入手机号信息到 profile
			await this.userProfilesRepository.update({ userId }, {
				phone: phone,
				phoneVerified: true,
			});

			// 查找创建的用户并登录
			user = await this.usersRepository.findOneBy({ id: userId }) as MiLocalUser | null;
			if (!user) {
				return reply.code(500).send({ error: 'Failed to create user' });
			}

			return this.signinService.signin(request, reply, user);

		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			console.error('[Phone Login] Error:', error);
			return reply.code(500).send({ error: 'Phone login failed', details: msg });
		}
	}

	@bindThis
	public async sendSmsCode(request: FastifyRequest, reply: FastifyReply) {
		const { phone } = request.body as { phone?: string };
		if (!phone) {
			return reply.code(400).send({ error: 'Missing phone number' });
		}

		if (!/^1[3-9]\d{9}$/.test(phone)) {
			return reply.code(400).send({ error: 'Invalid phone format' });
		}

		// 冷却期检查（60秒）
		const existing = smsCodes.get(phone);
		if (existing) {
			const elapsed = Date.now() - (existing.lastSent);
			if (elapsed < 60000) {
				const remaining = Math.ceil((60000 - elapsed) / 1000);
				return reply.code(429).send({ error: `${remaining}秒后再试` });
			}
		}

		// 生成验证码（使用加密安全 PRNG，避免被预测导致账号接管）
		const code = String(randomInt(100000, 1000000));

		// Enforce max map size — reject if full (prevents memory exhaustion)
		if (smsCodes.size >= MAX_SMS_CODES) {
			cleanupExpiredSmsCodes();
			if (smsCodes.size >= MAX_SMS_CODES) {
				return reply.code(503).send({ error: '短信服务繁忙，请稍后再试' });
			}
		}

		smsCodes.set(phone, {
			code,
			expiresAt: Date.now() + 5 * 60 * 1000,
			lastSent: Date.now(),
		});

		// 调用聚合数据短信 API（POST方式）
		// 强制要求环境变量配置,禁止硬编码 fallback 以防止密钥泄漏
		const appKey = process.env.JUHE_APPKEY;
		if (!appKey) {
			console.error('[JuHe SMS] JUHE_APPKEY 未配置,短信发送已禁用');
			return reply.code(503).send({ error: '短信服务未配置' });
		}
		const tplId = process.env.JUHE_SMS_TPL_ID || '274505';

interface JuHeSmsResponse {
	error_code: number;
	reason?: string;
	result?: unknown;
}

		try {
				// 使用 tpl_value 格式（和旧代码一致）
				const postData = new URLSearchParams({
					mobile: phone,
					tpl_id: tplId,
					tpl_value: `#code#=${code}`,
					key: appKey,
				});

				const smsResult = await new Promise<JuHeSmsResponse>((resolve, reject) => {
					const postDataStr = postData.toString();
					const options = {
						hostname: 'v.juhe.cn',
						port: 443,
						path: '/sms/send',
						method: 'POST',
						timeout: 10000,
						headers: {
							'Content-Type': 'application/x-www-form-urlencoded',
							'Content-Length': Buffer.byteLength(postDataStr),
						},
					};

					const req = https.request(options, (res) => {
						let data = '';
						res.on('data', (chunk) => { data += chunk; });
						res.on('end', () => {
							try {
								resolve(JSON.parse(data));
							} catch {
								resolve({ error_code: -1, reason: '解析响应失败' });
							}
						});
					});

					req.on('error', reject);
					req.on('timeout', () => { req.destroy(); reject(new Error('请求超时')); });
					req.write(postDataStr);
					req.end();
				});

				if (smsResult.error_code === 0) {
					// SMS sent successfully
				} else {
					console.error('[SMS] 发送失败:', smsResult);
					return reply.code(500).send({ error: smsResult.reason || '短信发送失败' });
				}
			} catch (smsError) {
				const msg = smsError instanceof Error ? smsError.message : String(smsError);
				console.error('[SMS] API调用失败:', msg);
			}

		return reply.send({ success: true, message: 'Verification code sent' });
	}
}
