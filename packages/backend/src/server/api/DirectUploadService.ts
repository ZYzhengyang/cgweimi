/*
 * CG微米 - 直传 COS 服务
 * 文件已经通过预签名 URL 上传到 COS，这里只负责注册数据库记录
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';
import type { MiMeta } from '@/models/Meta.js';
import type { MiLocalUser } from '@/models/User.js';
import type { DriveFilesRepository } from '@/models/_.js';
import { MiDriveFile } from '@/models/DriveFile.js';
import { FileInfoService } from '@/core/FileInfoService.js';
import { IdService } from '@/core/IdService.js';
import { AuthenticateService } from '@/server/api/AuthenticateService.js';
import { DriveFileEntityService } from '@/core/entities/DriveFileEntityService.js';
import { bindThis } from '@/decorators.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID, createHmac, createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unlink, writeFile } from 'node:fs/promises';

@Injectable()
export class DirectUploadService {

	constructor(
		@Inject(DI.config)
		private config: Config,

		@Inject(DI.meta)
		private meta: MiMeta,

		@Inject(DI.driveFilesRepository)
		private driveFilesRepository: DriveFilesRepository,

		private idService: IdService,
		private fileInfoService: FileInfoService,
		private authenticateService: AuthenticateService,
		private driveFileEntityService: DriveFileEntityService,
	) {}

	/**
	 * 手写 AWS Signature V4 生成预签名 PUT URL
	 */
	private generatePresignedUrl(key: string, contentType: string, expiresIn = 3600): string {
		const accessKey = this.meta.objectStorageAccessKey!;
		const secretKey = this.meta.objectStorageSecretKey!;
		const region = this.meta.objectStorageRegion || 'ap-shanghai';
		const bucket = this.meta.objectStorageBucket!;
		const endpoint = this.meta.objectStorageEndpoint || `cos.${region}.myqcloud.com`;
		const host = `${bucket}.${endpoint}`;

		const now = new Date();
		const dateStamp = now.toISOString().replace(/[:-]|\.\d{3}/g, '').substring(0, 8);
		const amzDate = `${dateStamp}T${now.toISOString().substring(11, 19).replace(/:/g, '')}Z`;
		const credential = `${accessKey}/${dateStamp}/${region}/s3/aws4_request`;
		const canonicalUri = '/' + key.split('/').map(s => encodeURIComponent(s)).join('/');

		const queryParams: [string, string][] = [
			['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
			['X-Amz-Credential', credential],
			['X-Amz-Date', amzDate],
			['X-Amz-Expires', String(expiresIn)],
			['X-Amz-SignedHeaders', 'content-type;host'],
		];

		const canonicalQueryString = queryParams
			.sort((a, b) => a[0].localeCompare(b[0]))
			.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
			.join('&');

		const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;
		const signedHeaders = 'content-type;host';
		const payloadHash = 'UNSIGNED-PAYLOAD';

		const canonicalRequest = ['PUT', canonicalUri, canonicalQueryString, canonicalHeaders, signedHeaders, payloadHash].join('\n');
		const scope = `${dateStamp}/${region}/s3/aws4_request`;
		const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, createHash('sha256').update(canonicalRequest).digest('hex')].join('\n');

		const kDate = createHmac('sha256', `AWS4${secretKey}`).update(dateStamp).digest();
		const kRegion = createHmac('sha256', kDate).update(region).digest();
		const kService = createHmac('sha256', kRegion).update('s3').digest();
		const kSigning = createHmac('sha256', kService).update('aws4_request').digest();
		const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex');

		return `https://${host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
	}

	@bindThis
	public async createPresignedUrl(request: FastifyRequest, reply: FastifyReply) {
		if (!this.meta.useObjectStorage) {
			return reply.code(400).send({ error: 'Object storage not enabled' });
		}

		const { name, type } = request.body as { name?: string; type?: string };
		if (!name || !type) {
			return reply.code(400).send({ error: 'Missing name or type' });
		}

		const prefix = this.meta.objectStoragePrefix ? `${this.meta.objectStoragePrefix}/` : '';
		const ext = name.match(/\.([a-zA-Z0-9_-]+)$/)?.[1] || '';
		const uuid = randomUUID();
		const key = `${prefix}direct-${uuid}${ext ? '.' + ext : ''}`;
		// accessKey 不含 prefix（用于 /files/:key 路由）
		const accessKey = `direct-${uuid}${ext ? '.' + ext : ''}`;

		try {
			const uploadUrl = this.generatePresignedUrl(key, type);
			return reply.send({ uploadUrl, key, accessKey, method: 'PUT', headers: { 'Content-Type': type } });
		} catch (error: any) {
			console.error('[DirectUpload] presign error:', error);
			return reply.code(500).send({ error: 'Failed to generate upload URL' });
		}
	}

	@bindThis
	public async registerUpload(request: FastifyRequest, reply: FastifyReply) {
		console.log('[DirectUpload] registerUpload called');
		try {
			const body = request.body as any;
			console.log('[DirectUpload] body type:', typeof body, 'keys:', body ? Object.keys(body) : 'null');
			const token = body?.i;
			console.log('[DirectUpload] token:', token ? `${token.substring(0, 8)}...len=${token.length}` : 'MISSING');
			const [user] = await this.authenticateService.authenticate(token);
			console.log('[DirectUpload] auth result, user:', user?.id ?? 'null');

			if (!user) {
				return reply.code(401).send({ error: 'Authentication required' });
			}

			const { key, accessKey, name, type, folderId, isSensitive, comment } = body;
			if (!key || !name || !type) {
				return reply.code(400).send({ error: 'Missing key, name, or type' });
			}

			// 下载文件：key 已包含 prefix，直接拼 endpoint
			const fileUrl = `https://${this.meta.objectStorageBucket}.${this.meta.objectStorageEndpoint}/${key}`;

			const ext = name.match(/\.([a-zA-Z0-9_-]+)$/)?.[1] || 'tmp';
			const tmpPath = join(tmpdir(), `direct-upload-${randomUUID()}.${ext}`);

			try {
				console.log('[DirectUpload] downloading:', fileUrl);
				const response = await fetch(fileUrl);
				console.log('[DirectUpload] download status:', response.status);
				if (!response.ok) {
					return reply.code(500).send({ error: `Download failed: ${response.status}` });
				}
				const buffer = Buffer.from(await response.arrayBuffer());
				await writeFile(tmpPath, buffer);

				// 分析文件元数据
				const info = await this.fileInfoService.getFileInfo(tmpPath, { fileName: name });

				// 使用 Misskey /files/ URL（同源，避免跨域问题）
				const fileAccessKey = accessKey || key;
				const fileAccessUrl = `${this.config.url}/files/${fileAccessKey}`;

				// 生成缩略图 URL（如果有的话，由 DriveService 处理，这里先不生成）
				// 直接写数据库记录
				const fileId = this.idService.gen();
				// url: 前端播放用（nginx 代理 COS，同源）
				// uri: COS 直连地址（备用）
				const cosProxyUrl = `${this.config.url}/cos-files/${key}`;
				const driveFile = await this.driveFilesRepository.insertOne({
					id: fileId,
					userId: user.id,
					name: name,
					type: type,
					md5: info.md5,
					size: info.size,
					comment: comment ?? null,
					properties: info.width && info.height ? { width: info.width, height: info.height } : {},
					storedInternal: false,
					isLink: false,  // 不走 FileResolver 的下载逻辑
					url: cosProxyUrl,
					thumbnailUrl: null,
					webpublicUrl: null,
					accessKey: fileAccessKey,
					thumbnailAccessKey: null,
					webpublicAccessKey: null,
					webpublicType: null,
					folderId: folderId ?? null,
					isSensitive: isSensitive ?? false,
					isLink: false,
					maybeSensitive: info.sensitive,
					maybePorn: info.porn,
				});

				const packed = await this.driveFileEntityService.pack(driveFile, { self: true });
				return reply.send(packed);

			} finally {
				try { await unlink(tmpPath); } catch {}
			}

		} catch (error: any) {
			console.error('[DirectUpload] error:', error.message);
			return reply.code(500).send({ error: error.message || 'Registration failed' });
		}
	}
}
