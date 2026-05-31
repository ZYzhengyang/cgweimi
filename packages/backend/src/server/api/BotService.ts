/**
 * CG微米 - Bot 账号创建服务
 * 作为 Fastify 路由注册，手动验证 admin 身份
 */
import { Inject, Injectable } from '@nestjs/common';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { UsersRepository, AccessTokensRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { SignupService } from '@/core/SignupService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { Packed } from '@/misc/json-schema.js';

@Injectable()
export class BotService {
	constructor(
		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		@Inject(DI.accessTokensRepository)
		private accessTokensRepository: AccessTokensRepository,

		private userEntityService: UserEntityService,
		private signupService: SignupService,
	) {}

	public async createBot(request: FastifyRequest, reply: FastifyReply) {
		const body = request.body as { i?: string; username?: string; password?: string };
		const token = body.i;

		if (!token || !body.username || !body.password) {
			return reply.code(400).send({ error: { message: 'Missing required fields: i, username, password' } });
		}

		// 验证 token 并查找用户
		const accessToken = await this.accessTokensRepository.findOneBy({ token });
		if (!accessToken) {
			return reply.code(401).send({ error: { message: 'Invalid token' } });
		}

		const user = await this.usersRepository.findOneBy({ id: accessToken.userId });
		if (!user || !user.isAdmin) {
			return reply.code(403).send({ error: { message: 'Admin access required' } });
		}

		try {
			const { account, secret } = await this.signupService.signup({
				username: body.username,
				password: body.password,
				ignorePreservedUsernames: true,
			});

			const res = await this.userEntityService.pack(account, account, {
				schema: 'MeDetailed',
				includeSecrets: true,
			}) as Packed<'MeDetailed'> & { token: string };

			res.token = secret;
			return reply.send(res);
		} catch (e: any) {
			return reply.code(400).send({ error: { message: e.message || 'Failed to create account' } });
		}
	}
}
