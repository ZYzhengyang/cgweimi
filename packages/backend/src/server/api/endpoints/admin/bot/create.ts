/**
 * CG微米 - 批量创建账号 API
 * POST /api/admin/bot/create
 * 需要 admin 用户的 token (i)
 * 安全性：requireCredential + 代码内手动检查 me.isAdmin
 */
import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { UsersRepository } from '@/models/_.js';
import { SignupService } from '@/core/SignupService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { localUsernameSchema, passwordSchema } from '@/models/User.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '@/server/api/error.js';
import { Packed } from '@/misc/json-schema.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	kind: 'write:admin',

	errors: {
		accessDenied: {
			message: 'Access denied. Admin only.',
			code: 'ACCESS_DENIED',
			id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
		},
	},

	res: {
		type: 'object',
		optional: false, nullable: false,
		allOf: [
			{
				type: 'object',
				ref: 'MeDetailed',
			},
			{
				type: 'object',
				optional: false, nullable: false,
				properties: {
					token: {
						type: 'string',
						optional: false, nullable: false,
					},
				},
			}
		],
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		username: localUsernameSchema,
		password: passwordSchema,
	},
	required: ['username', 'password'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		private userEntityService: UserEntityService,
		private signupService: SignupService,
	) {
		super(meta, paramDef, async (ps, me) => {
			if (!me || !me.isAdmin) {
				throw new ApiError(meta.errors.accessDenied);
			}

			const { account, secret } = await this.signupService.signup({
				username: ps.username,
				password: ps.password,
				ignorePreservedUsernames: true,
			});

			const res = await this.userEntityService.pack(account, account, {
				schema: 'MeDetailed',
				includeSecrets: true,
			}) as Packed<'MeDetailed'> & { token: string };

			res.token = secret;
			return res;
		});
	}
}
