/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import Limiter from 'ratelimiter';
import * as Redis from 'ioredis';
import { DI } from '@/di-symbols.js';
import type Logger from '@/logger.js';
import { LoggerService } from '@/core/LoggerService.js';
import { bindThis } from '@/decorators.js';
import type { IEndpointMeta } from './endpoints.js';

type RateLimitInfo = {
	code: 'BRIEF_REQUEST_INTERVAL',
	info: Limiter.LimiterInfo,
} | {
	code: 'RATE_LIMIT_EXCEEDED',
	info: Limiter.LimiterInfo,
};

@Injectable()
export class RateLimiterService {
	private logger: Logger;
	/**
	 * Non-production (dev/test) で本番より大幅に緩めた倍率を適用する。
	 * - 短期間隔 (minInterval) は 1/10 → 間隔が短くなり、緩くなる
	 * - 長期クォータ (max) は 10 倍 → 許容量が増え、緩くなる
	 * 完全には無効化せず、限速ロジック自体は走らせつつ開発体験を損なわない値。
	 */
	private readonly devMultiplier = 10;

	constructor(
		@Inject(DI.redis)
		private redisClient: Redis.Redis,

		private loggerService: LoggerService,
	) {
		this.logger = this.loggerService.getLogger('limiter');
	}

	@bindThis
	private checkLimiter(options: Limiter.LimiterOption): Promise<Limiter.LimiterInfo> {
		return new Promise<Limiter.LimiterInfo>((resolve, reject) => {
			new Limiter(options).get((err, info) => {
				if (err) {
					return reject(err);
				}
				resolve(info);
			});
		});
	}

	@bindThis
	public async limit(limitation: IEndpointMeta['limit'] & { key: NonNullable<string> }, actor: string, factor = 1): Promise<RateLimitInfo | null> {
		const isDev = process.env.NODE_ENV !== 'production';
		// dev: minInterval を 1/devMultiplier に縮め、max を devMultiplier 倍に拡大
		// → 実効的に 5〜10 倍緩いが、限速ロジック自体は有効
		const minIntervalFactor = isDev ? 1 / this.devMultiplier : 1;
		const maxFactor = isDev ? this.devMultiplier : 1;

		// Short-term limit
		if (limitation.minInterval != null) {
			const info = await this.checkLimiter({
				id: `${actor}:${limitation.key}:min`,
				duration: limitation.minInterval * factor * minIntervalFactor,
				max: 1,
				db: this.redisClient,
			});

			this.logger.debug(`${actor} ${limitation.key} min remaining: ${info.remaining}`);

			if (info.remaining === 0) {
				return { code: 'BRIEF_REQUEST_INTERVAL', info };
			}
		}

		// Long term limit
		if (limitation.duration != null && limitation.max != null) {
			const info = await this.checkLimiter({
				id: `${actor}:${limitation.key}`,
				duration: limitation.duration,
				max: (limitation.max * maxFactor) / factor,
				db: this.redisClient,
			});

			this.logger.debug(`${actor} ${limitation.key} max remaining: ${info.remaining}`);

			if (info.remaining === 0) {
				return { code: 'RATE_LIMIT_EXCEEDED', info };
			}
		}

		return null;
	}
}
